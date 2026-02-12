/**
 * UjuZ - Strategy Engine v2
 *
 * Analyzes 3 admission routes (public, workplace, extended) and produces
 * evidence-based WidgetPayload + enriched StrategyFacility[].
 *
 * Architecture:
 *   Server = decision logic (grades, reasons from admission engine evidence)
 *   Claude = copy polish only (one_liner, disclaimer)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Db } from 'mongodb';
import { getDbOrThrow } from './db';
import { AppError } from './errors';
import { U } from './collections';
import { env } from './env';
import { logger } from './logger';
import { searchFacilities, findNearbyFacilities } from './facility/facilityService';
import { calculateAdmissionScoreV2 } from './admissionEngineV2';
import type { AdmissionScoreResultV2 } from './admissionTypes';
import type { FacilityListItem } from './facility/types';
import type { RecommendationDoc, ChecklistDoc } from './dbTypes';
import type {
  WidgetPayload,
  RouteCard,
  RouteGrade,
  RouteId,
  WeeklyAction,
  WidgetSummary,
  RecommendationInput,
  RecommendationResponse,
  ChecklistItem,
  StrategyFacility,
} from '../types';

// ── Internal types ──────────────────────────────────────

export interface ScoredFacility {
  facility: FacilityListItem;
  result: AdmissionScoreResultV2 | null; // null = scoring failed
}

export interface RouteAnalysis {
  route_id: RouteId;
  scored: ScoredFacility[];
  best: AdmissionScoreResultV2 | null;
  grade: RouteGrade;
  reasons: [string, string, string];
  enriched: StrategyFacility[];
  mode?: 'default' | 'pickup_backup';
}

type ScoreCache = Map<string, Promise<AdmissionScoreResultV2 | null>>;

interface ScoringStats {
  cacheHits: number;
  cacheMisses: number;
  scoredCount: number;
}

// ── Grade mapping ───────────────────────────────────────

/** Map admission grade (A–F) to route grade (HIGH/MEDIUM/LOW) */
function admissionToRouteGrade(grade: string): RouteGrade {
  if (grade === 'A' || grade === 'B') return 'HIGH';
  if (grade === 'C' || grade === 'D') return 'MEDIUM';
  return 'LOW';
}

function bestGrade(grades: RouteGrade[]): RouteGrade {
  if (grades.includes('HIGH')) return 'HIGH';
  if (grades.includes('MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

export function ensureThreeReasons(
  reasons: string[],
  routeId: RouteId,
  needExtended: boolean,
): [string, string, string] {
  const fallbackByRoute: Record<RouteId, string[]> = {
    public: [
      '주변 공공시설 데이터를 기준으로 분석했어요',
      '실시간 변동 가능성을 고려해 주세요',
      '알림 설정으로 변화에 빠르게 대응할 수 있어요',
    ],
    workplace: [
      '직장어린이집 자격 확인이 먼저 필요해요',
      '회사 정보 입력 시 매칭 정확도가 올라가요',
      '공동직장 어린이집도 함께 탐색해 보세요',
    ],
    extended: needExtended
      ? [
        '연장보육 가능 여부를 우선 반영했어요',
        '시설별 운영시간 차이가 있을 수 있어요',
        '상세 운영시간은 시설 공지로 재확인해 주세요',
      ]
      : [
        '픽업 안정성을 위한 백업 후보를 구성했어요',
        '거리와 접근성을 중심으로 정렬했어요',
        '예상 입소 확률과 함께 비교해 보세요',
      ],
  };

  const filtered = reasons.filter((r) => r && r.trim().length > 0).slice(0, 3);
  while (filtered.length < 3) {
    filtered.push(fallbackByRoute[routeId][filtered.length]);
  }
  return [filtered[0], filtered[1], filtered[2]];
}

// ── Evidence → Reasons extraction ───────────────────────

export function extractReasons(
  scored: ScoredFacility[],
  routeId: RouteId,
  needExtended: boolean,
): [string, string, string] {
  const best = scored.find((s) => s.result)?.result;

  if (!best) {
    // No scored facilities
    if (routeId === 'workplace') {
      return ensureThreeReasons([
        '직장어린이집 자격 확인이 필요해요',
        '회사명을 입력하면 매칭 결과를 알려드려요',
        '공동직장 어린이집도 탐색 가능',
      ], routeId, needExtended);
    }
    return ensureThreeReasons([
      '해당 유형 시설이 주변에 없어요',
      '검색 반경을 넓혀 보세요',
      '다른 루트를 우선 고려하세요',
    ], routeId, needExtended);
  }

  const reasons: string[] = [];

  // Reason 1: Score/Probability — the headline
  const prob = Math.round(best.probability * 100);
  reasons.push(
    `6개월 입소 확률 ${prob}% (${best.grade}등급)`,
  );

  // Reason 2: From evidence cards — TO data or wait estimate
  const toEvidence = best.evidenceCards.find((e) => e.type === 'TO_SNAPSHOT');
  const toData = toEvidence?.data as Record<string, number> | undefined;
  if (toData && (toData.N ?? 0) > 0) {
    const n = toData.N ?? 0;
    const rate = ((toData.rho_observed ?? 0) * (toData.E_seat_months ?? 1) / Math.max(1, toData.E_seat_months ?? 1));
    reasons.push(`최근 TO ${n}건 발생 (월평균 ${(rate).toFixed(1)}건)`);
  } else if (best.waitMonths.median > 0) {
    reasons.push(`대기 중위 ${best.waitMonths.median}개월 예상`);
  } else {
    reasons.push('데이터 수집 중, 추정치 기반 분석');
  }

  // Reason 3: Context — seasonal or community or route-specific
  const seasonEvidence = best.evidenceCards.find((e) => e.type === 'SEASONAL_FACTOR');
  const communityEvidence = best.evidenceCards.find((e) => e.type === 'COMMUNITY_AGGREGATE');

  if (routeId === 'extended' && !needExtended) {
    reasons.push('거리·운영시간 최적 시설 우선 정렬');
  } else if (communityEvidence && communityEvidence.strength > 0.5) {
    const srcCount = (communityEvidence.data as Record<string, number>)?.total_sources ?? 0;
    reasons.push(`커뮤니티 인텔 ${srcCount}건 반영`);
  } else if (seasonEvidence) {
    const seasonData = seasonEvidence.data as Record<string, number[]>;
    const months = seasonData?.months_ahead ?? [];
    if (months.length >= 2) {
      reasons.push(`${months[0]}–${months[months.length - 1]}월 시즌 영향 반영`);
    } else {
      reasons.push('시즌 영향 분석 완료');
    }
  } else {
    reasons.push(`주변 ${scored.length}개 시설 탐색 완료`);
  }

  return ensureThreeReasons(reasons, routeId, needExtended);
}

// ── Facility enrichment (chips from real data) ──────────

export function enrichFacility(
  sf: ScoredFacility,
  routeId: RouteId,
): StrategyFacility {
  const { facility, result } = sf;
  const chips: string[] = [];

  if (result) {
    // Score chip
    const prob = Math.round(result.probability * 100);
    chips.push(`확률 ${prob}%`);

    // Wait chip
    if (result.waitMonths.median > 0) {
      chips.push(`대기 ~${result.waitMonths.median}개월`);
    }
  }

  // Extended chip
  if (facility.extended_care) {
    chips.push('연장 가능');
  }

  // Workplace employer match
  if (routeId === 'workplace' && facility.employer_name) {
    chips.push(facility.employer_name);
  }

  // Type chip if no other context
  if (chips.length < 2) {
    const typeLabel = facilityTypeLabel(facility.type);
    if (typeLabel) chips.push(typeLabel);
  }

  return {
    id: facility.provider_id,
    name: facility.name,
    type: facility.type,
    location: facility.location ?? { lat: 0, lng: 0 },
    chips,
    extended: facility.extended_care ?? false,
    tags: [facility.type, facility.address?.sigungu].filter(Boolean) as string[],
    score: result?.score,
    probability: result?.probability,
    grade: result?.grade,
    wait_months: result?.waitMonths.median,
  };
}

function facilityTypeLabel(type: string): string | null {
  const labels: Record<string, string> = {
    national_public: '국공립',
    public: '공립',
    private: '민간',
    home: '가정',
    cooperative: '협동',
    workplace: '직장',
  };
  return labels[type] ?? null;
}

// ── Score facilities in parallel ────────────────────────

async function scoreFacilities(
  facilities: FacilityListItem[],
  childAge: string,
  scoreCache: ScoreCache,
  stats: ScoringStats,
): Promise<ScoredFacility[]> {
  const concurrency = resolveScoreConcurrency(process.env.STRATEGY_SCORE_CONCURRENCY);
  const results = new Array<ScoredFacility>(facilities.length);

  let cursor = 0;
  async function worker() {
    while (cursor < facilities.length) {
      const current = cursor;
      cursor += 1;
      const facility = facilities[current];
      const cacheKey = `${facility.provider_id}|${childAge}|general`;

      let scorePromise = scoreCache.get(cacheKey);
      if (!scorePromise) {
        stats.cacheMisses += 1;
        scorePromise = calculateAdmissionScoreV2({
          facility_id: facility.provider_id,
          child_age_band: childAge as '0' | '1' | '2' | '3' | '4' | '5',
          priority_type: 'general',
        }).catch(() => null);
        scoreCache.set(cacheKey, scorePromise);
      } else {
        stats.cacheHits += 1;
      }

      const result = await scorePromise;
      results[current] = { facility, result };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, facilities.length) }, () => worker()));
  stats.scoredCount += facilities.length;
  return results;
}

function resolveScoreConcurrency(rawValue: string | undefined): number {
  const parsed = Number(rawValue ?? 4);
  if (!Number.isFinite(parsed)) {
    return 4;
  }
  return Math.max(1, Math.min(8, Math.floor(parsed)));
}

// ── Route analysis ──────────────────────────────────────

async function analyzePublicRoute(
  db: Db,
  ctx: RecommendationInput['user_context'],
  scoreCache: ScoreCache,
  stats: ScoringStats,
): Promise<RouteAnalysis> {
  const facilities = await findNearbyFacilities(db, {
    lat: ctx.home.lat,
    lng: ctx.home.lng,
    radius_m: 5000,
    limit: 5,
    type: 'national_public',
  });

  const scored = await scoreFacilities(facilities, ctx.child_age, scoreCache, stats);
  // Sort by score descending
  scored.sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0));

  const best = scored.find((s) => s.result)?.result ?? null;
  const grade = best ? admissionToRouteGrade(best.grade) : 'LOW';
  const reasons = extractReasons(scored, 'public', ctx.need_extended);
  const enriched = scored.map((s) => enrichFacility(s, 'public'));

  return { route_id: 'public', scored, best, grade, reasons, enriched };
}

async function analyzeWorkplaceRoute(
  db: Db,
  ctx: RecommendationInput['user_context'],
  scoreCache: ScoreCache,
  stats: ScoringStats,
): Promise<RouteAnalysis> {
  let facilities: FacilityListItem[] = [];

  if (ctx.employer) {
    // Search by employer name
    const result = await searchFacilities(db, {
      type: 'workplace',
      name: ctx.employer.name,
      limit: 5,
    });
    facilities = result.facilities;

    // Fallback: nearby workplace facilities
    if (facilities.length === 0 && ctx.work) {
      facilities = await findNearbyFacilities(db, {
        lat: ctx.work.lat,
        lng: ctx.work.lng,
        radius_m: 10000,
        limit: 5,
        type: 'workplace',
      });
    }

    // Fallback: nearby workplace from home
    if (facilities.length === 0) {
      facilities = await findNearbyFacilities(db, {
        lat: ctx.home.lat,
        lng: ctx.home.lng,
        radius_m: 10000,
        limit: 3,
        type: 'workplace',
      });
    }
  } else {
    // Graceful fallback without employer: keep workplace card alive with nearby suggestions.
    facilities = await findNearbyFacilities(db, {
      lat: ctx.work?.lat ?? ctx.home.lat,
      lng: ctx.work?.lng ?? ctx.home.lng,
      radius_m: 12000,
      limit: 3,
      type: 'workplace',
    });

    if (facilities.length === 0) {
      facilities = await findNearbyFacilities(db, {
        lat: ctx.home.lat,
        lng: ctx.home.lng,
        radius_m: 12000,
        limit: 3,
        type: 'workplace',
      });
    }
  }

  const scored = await scoreFacilities(facilities, ctx.child_age, scoreCache, stats);
  scored.sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0));

  const best = scored.find((s) => s.result)?.result ?? null;
  const grade = best ? admissionToRouteGrade(best.grade) : 'LOW';
  const reasons = extractReasons(scored, 'workplace', ctx.need_extended);
  const enriched = scored.map((s) => enrichFacility(s, 'workplace'));

  return { route_id: 'workplace', scored, best, grade, reasons, enriched };
}

async function analyzeExtendedRoute(
  db: Db,
  ctx: RecommendationInput['user_context'],
  scoreCache: ScoreCache,
  stats: ScoringStats,
): Promise<RouteAnalysis> {
  let mode: RouteAnalysis['mode'] = 'default';
  let facilities = await findNearbyFacilities(db, {
    lat: ctx.home.lat,
    lng: ctx.home.lng,
    radius_m: 5000,
    limit: 10,
  });

  if (ctx.need_extended) {
    // Prefer extended care facilities
    const withExtendedField = facilities.filter((f) => typeof f.extended_care === 'boolean');
    const extended = facilities.filter((f) => f.extended_care);
    if (extended.length > 0) {
      facilities = extended;
    } else if (withExtendedField.length === 0) {
      // No extended_care field on candidates: reinterpret as pickup-stability backup.
      mode = 'pickup_backup';
    }
    // If no extended care data available, keep all (graceful degradation)
  }
  // When need_extended=false, this becomes "픽업 안정 백업" —
  // use all nearby facilities sorted by proximity (already sorted by $nearSphere)

  facilities = facilities.slice(0, 5);

  const scored = await scoreFacilities(facilities, ctx.child_age, scoreCache, stats);
  scored.sort((a, b) => (b.result?.score ?? 0) - (a.result?.score ?? 0));

  const best = scored.find((s) => s.result)?.result ?? null;
  const grade = best ? admissionToRouteGrade(best.grade) : 'LOW';
  const reasons = extractReasons(scored, 'extended', mode === 'pickup_backup' ? false : ctx.need_extended);
  const enriched = scored.map((s) => enrichFacility(s, 'extended'));

  return { route_id: 'extended', scored, best, grade, reasons, enriched, mode };
}

// ── Route title ─────────────────────────────────────────

function routeTitle(routeId: RouteId, needExtended: boolean): string {
  switch (routeId) {
    case 'public': return '국공립 루트';
    case 'workplace': return '직장 루트';
    case 'extended':
      return needExtended ? '연장보육 루트' : '픽업 안정 백업';
  }
}

export function buildTemplateCopy(overallGrade: RouteGrade): { one_liner: string; disclaimer: string } {
  return {
    one_liner: defaultOneLiner(overallGrade),
    disclaimer: '확률 기반 분석이며 실제 결과와 다를 수 있습니다.',
  };
}

// ── Weekly actions (contextual) ─────────────────────────

export function buildWeeklyActions(
  routes: RouteAnalysis[],
  hasEmployer: boolean,
): [WeeklyAction, WeeklyAction, WeeklyAction] {
  const bestRoute = routes.reduce((best, r) =>
    (r.best?.score ?? 0) > (best.best?.score ?? 0) ? r : best,
  );
  const hasHighRoute = routes.some((r) => r.grade === 'HIGH');

  // Action 1: Always TO alerts
  const alertAction: WeeklyAction = {
    key: 'alerts',
    title: hasHighRoute ? 'TOP 시설 알림 켜기' : 'TO 알림 설정',
    cta: '알림 켜기',
    priority: 'HIGH',
  };

  // Action 2: Docs or eligibility check
  const docsAction: WeeklyAction = !hasEmployer
    ? { key: 'docs', title: '직장 자격 확인', cta: '30초 체크', priority: 'HIGH' }
    : { key: 'docs', title: '증빙서류 체크', cta: '체크리스트', priority: 'HIGH' };

  // Action 3: Portfolio adjustment
  const portfolioAction: WeeklyAction = {
    key: 'portfolio',
    title: bestRoute.scored.length > 3 ? '2지망 조정' : '시설 더보기',
    cta: '포트폴리오',
    priority: 'MEDIUM',
  };

  return [alertAction, docsAction, portfolioAction];
}

// ── Claude copy polish ──────────────────────────────────

async function polishCopyWithClaude(
  overallGrade: RouteGrade,
  routes: RouteAnalysis[],
  childAge: string,
): Promise<{ one_liner: string; disclaimer: string } | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const routeSummaries = routes.map((r) => ({
      route_id: r.route_id,
      grade: r.grade,
      facility_count: r.scored.length,
      best_score: r.best?.score ?? 0,
      best_probability: r.best?.probability ?? 0,
    }));

    const response = await client.messages.create({
      model: env.STRATEGY_CLAUDE_MODEL ?? 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      system: `You output ONLY valid JSON. No markdown. Korean language.
Generate a one_liner (max 30 chars) and disclaimer (max 50 chars).
one_liner: empathetic, action-oriented summary of the child's admission outlook.
disclaimer: probabilistic hedging statement.
Schema: {"one_liner":"string","disclaimer":"string"}`,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          overall_grade: overallGrade,
          child_age: childAge,
          routes: routeSummaries,
        }),
      }],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    // Strip markdown code fences if present (```json ... ```)
    const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(text) as { one_liner?: string; disclaimer?: string };
    if (!parsed.one_liner || !parsed.disclaimer) {
      return null;
    }
    return {
      one_liner: parsed.one_liner.slice(0, 30),
      disclaimer: parsed.disclaimer.slice(0, 50),
    };
  } catch (err) {
    logger.warn('Claude copy polish failed, using defaults', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function defaultOneLiner(grade: RouteGrade): string {
  switch (grade) {
    case 'HIGH': return '루트가 열려 있어요. 지금 준비하세요.';
    case 'MEDIUM': return '가능성이 보여요. 전략적 접근이 필요해요.';
    case 'LOW': return '지금은 좁지만, 대안을 함께 찾아요.';
  }
}

// ── Main entry point ────────────────────────────────────

export async function analyzeRoutes(
  input: RecommendationInput,
  userId: string,
): Promise<RecommendationResponse> {
  const ctx = input.user_context;
  const db = await getDbOrThrow();
  const scoreCache: ScoreCache = new Map();
  const scoringStats: ScoringStats = { cacheHits: 0, cacheMisses: 0, scoredCount: 0 };
  const startedAt = Date.now();

  // 1. Run 3 routes in parallel
  const [publicRoute, workplaceRoute, extendedRoute] = await Promise.all([
    analyzePublicRoute(db, ctx, scoreCache, scoringStats),
    analyzeWorkplaceRoute(db, ctx, scoreCache, scoringStats),
    analyzeExtendedRoute(db, ctx, scoreCache, scoringStats),
  ]);

  const routes = [publicRoute, workplaceRoute, extendedRoute];
  const overallGrade = bestGrade(routes.map((r) => r.grade));

  // 2. Claude polishes copy only (reasons already computed from evidence)
  const templateCopy = buildTemplateCopy(overallGrade);
  const copy = await polishCopyWithClaude(overallGrade, routes, ctx.child_age);
  const finalCopy = copy ?? templateCopy;

  // 3. Build route cards
  const routeCards = routes.map((r): RouteCard => {
    const card: RouteCard = {
      route_id: r.route_id,
      title: routeTitle(r.route_id, r.route_id === 'extended' ? r.mode !== 'pickup_backup' && ctx.need_extended : ctx.need_extended),
      grade: r.grade,
      reasons: r.reasons, // evidence-based, not from Claude
      facility_ids: r.enriched.map((f) => f.id).slice(0, 3),
    };

    // Workplace with no employer → CTA for eligibility check
    if (r.route_id === 'workplace' && !ctx.employer) {
      card.next_step = { title: '직장 자격을 확인해 보세요', cta: '30초 체크' };
    }

    return card;
  });

  if (routeCards.length !== 3) {
    throw new AppError('Expected exactly 3 route cards', 500);
  }
  const typedRouteCards = routeCards as [RouteCard, RouteCard, RouteCard];

  // 4. Build summary
  const summary: WidgetSummary = {
    overall_grade: overallGrade,
    one_liner: finalCopy.one_liner,
    confidence: overallGrade,
    updated_at: new Date().toISOString().slice(0, 10),
  };

  // 5. Build weekly actions (contextual)
  const weeklyActions = buildWeeklyActions(routes, !!ctx.employer);

  // 6. Assemble payload
  const disclaimer = finalCopy.disclaimer;

  const widget: WidgetPayload = {
    summary,
    weekly_actions: weeklyActions,
    routes: typedRouteCards,
    disclaimer,
  };

  // 7. Collect all enriched facilities (deduped by id)
  const facilitiesMap = new Map<string, StrategyFacility>();
  for (const route of routes) {
    for (const f of route.enriched) {
      if (!facilitiesMap.has(f.id)) {
        facilitiesMap.set(f.id, f);
      }
    }
  }
  const facilities = Array.from(facilitiesMap.values());

  // 8. Save recommendation to DB
  const recommendationId = crypto.randomUUID();
  await db.collection<RecommendationDoc>(U.RECOMMENDATIONS).insertOne({
    recommendation_id: recommendationId,
    user_id: userId,
    user_context: ctx,
    widget,
    created_at: new Date(),
  } as RecommendationDoc);

  // 9. Create checklist
  const checklistItems: ChecklistItem[] = [
    { key: 'resident_cert', title: '주민등록등본', reason: '거주지 확인용', done: false },
    { key: 'employment_cert', title: '재직증명서', reason: '맞벌이/직장 가점', done: false },
    { key: 'health_check', title: '건강검진 결과', reason: '입소 필수 서류', done: false },
    { key: 'vaccination', title: '예방접종 증명서', reason: '입소 필수 서류', done: false },
    { key: 'income_cert', title: '소득확인서', reason: '보육료 지원 신청용', done: false },
  ];

  await db.collection<ChecklistDoc>(U.CHECKLISTS).insertOne({
    recommendation_id: recommendationId,
    user_id: userId,
    items: checklistItems,
    created_at: new Date(),
    updated_at: new Date(),
  } as ChecklistDoc);

  logger.info('Strategy analyzeRoutes completed', {
    elapsed_ms: Date.now() - startedAt,
    facilities_scored: scoringStats.scoredCount,
    score_cache_hits: scoringStats.cacheHits,
    score_cache_misses: scoringStats.cacheMisses,
  });

  return { recommendation_id: recommendationId, widget, facilities };
}

// ── Checklist retrieval ─────────────────────────────────

export async function getChecklist(
  recommendationId: string,
  userId: string,
): Promise<ChecklistItem[]> {
  const db = await getDbOrThrow();
  const doc = await db.collection<ChecklistDoc>(U.CHECKLISTS).findOne({
    recommendation_id: recommendationId,
    user_id: userId,
  });

  return doc?.items ?? [];
}

export async function toggleChecklistItem(
  recommendationId: string,
  userId: string,
  itemKey: string,
  done: boolean,
): Promise<void> {
  const db = await getDbOrThrow();
  await db.collection<ChecklistDoc>(U.CHECKLISTS).updateOne(
    { recommendation_id: recommendationId, user_id: userId, 'items.key': itemKey },
    { $set: { 'items.$.done': done, updated_at: new Date() } },
  );
}
