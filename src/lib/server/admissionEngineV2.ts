/**
 * UJUz - Admission Score Engine V2.0
 *
 * Bayesian Gamma-Poisson model with NB predictive distribution.
 * Orchestrates data fetching, Bayesian computation, evidence generation, and caching.
 */

import { jStat } from 'jstat';
import { z } from 'zod';
import { getDbOrThrow } from './db';
import { env } from './env';
import { AppError } from './errors';
import { type RegionKey, regionLabel } from './regions';
import { extractRegionFromAddress } from './extractRegion';
import { U } from './collections';
import type { PlaceDoc, WaitlistSnapshotDoc, AdmissionCacheDoc, DataBlockDoc } from './dbTypes';
import { logger } from './logger';
import {
  GAMMA_PRIOR_MEANS,
  REGION_COMPETITION,
  PRIORITY_BONUS,
  SEASONAL_MULTIPLIER,
  AGE_BAND_CAPACITY_RATIO,
  E0,
  K_ANONYMITY_THRESHOLD,
  MIN_CONFIDENCE_FOR_COMMUNITY,
  CALIBRATION_ARRAY,
  HEURISTIC_VACANCY_RATE,
  MIN_HEURISTIC_CONFIDENCE,
} from './admissionParams';

// Re-export types and math for backward compatibility
export type { AdmissionGradeV2, EvidenceType, AdmissionScoreInputV2, EvidenceCardV2, AdmissionScoreResultV2 } from './admissionTypes';
export { toAgeBandStr, scoreToGrade, findWaitMonthsInterpolated } from './admissionMath';

import type { AdmissionScoreInputV2, EvidenceCardV2, AdmissionScoreResultV2 } from './admissionTypes';
import {
  clamp,
  sigmoid,
  scoreToGrade,
  effectiveHorizon,
  getCacheKey,
  findWaitMonthsInterpolated,
  calcStrength,
  validateNBParams,
  EVENT_TIMEOUT_HOURS,
  ENGINE_VERSION,
} from './admissionMath';
import { readAdmissionBlocks } from './admissionData';

type DbClient = Awaited<ReturnType<typeof getDbOrThrow>>;
type PrebuiltBlocks = Awaited<ReturnType<typeof readAdmissionBlocks>>;

interface FetchedAdmissionData {
  db: DbClient;
  facility: PlaceDoc;
  latestSnapshot: WaitlistSnapshotDoc | null;
  prebuiltBlocks: PrebuiltBlocks;
}

interface NormalizedAdmissionData {
  facilityName: string;
  region: RegionKey;
  capacityByClass: Record<string, number>;
  capacityEff: number;
  waitingPosition: number;
  effectiveWaiting: number;
}

interface BayesianContext {
  N: number;
  ESeatMonths: number;
  rhoObserved: number;
  alphaPost: number;
  betaPost: number;
  rhoPostMean: number;
  snapshotCount: number;
  fromPrebuilt: boolean;
  prebuiltConfidence?: number;
  priorMean: number;
  ageBandNormalization: 'by_class' | 'total_facility';
}

interface EvidenceBuildInput {
  db: DbClient;
  scoreInput: AdmissionScoreInputV2;
  prebuiltBlocks: PrebuiltBlocks;
  normalized: NormalizedAdmissionData;
  bayesian: BayesianContext;
  currentMonth: number;
}

interface EvidenceBuildOutput {
  evidenceCards: EvidenceCardV2[];
  alphaPost: number;
  betaPost: number;
  rhoPostMean: number;
}

const capacityByClassSchema = z.record(z.string(), z.number());
const capacityDocSchema = z.object({ total: z.number().optional() }).passthrough();
const vacancyBlockDataSchema = z.object({
  N: z.number().optional(),
  E_seat_months: z.number().optional(),
  rho_observed: z.number().optional(),
  alpha_post: z.number().optional(),
  beta_post: z.number().optional(),
}).passthrough();
const communitySignalDataSchema = z.object({
  intel_enriched: z.boolean().optional(),
  intel_source_count: z.number().optional(),
  to_mention_count: z.number().optional(),
  avg_reported_wait_months: z.number().optional(),
  competition_level: z.string().optional(),
  avg_sentiment: z.number().optional(),
  k_threshold: z.number().optional(),
}).passthrough();
const admissionScoreResultSchema = z.object({
  probability: z.number(),
  score: z.number(),
  grade: z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
  confidence: z.number(),
  waitMonths: z.object({
    median: z.number(),
    p80: z.number(),
  }),
  effectiveWaiting: z.number(),
  posterior: z.object({
    alpha: z.number(),
    beta: z.number(),
  }),
  evidenceCards: z.array(z.object({
    type: z.enum(['TO_SNAPSHOT', 'COMMUNITY_AGGREGATE', 'SEASONAL_FACTOR', 'SIMILAR_CASES']),
    summary: z.string(),
    strength: z.number(),
    data: z.record(z.string(), z.unknown()),
  })),
  version: z.string(),
  asOf: z.string(),
  facility_id: z.string(),
  facility_name: z.string(),
  region_key: z.string(),
});

function toCapacity(rawCapacity: PlaceDoc['capacity']): number {
  if (typeof rawCapacity === 'number') return rawCapacity;
  const parsed = capacityDocSchema.safeParse(rawCapacity);
  return parsed.success ? (parsed.data.total ?? 0) : 0;
}

function toCapacityByClass(raw: PlaceDoc['capacity_by_class']): Record<string, number> {
  const parsed = capacityByClassSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

async function fetchAdmissionData(input: AdmissionScoreInputV2): Promise<FetchedAdmissionData> {
  const db = await getDbOrThrow();
  const [facility, latestSnapshot, prebuiltBlocks] = await Promise.all([
    db.collection<PlaceDoc>(env.MONGODB_PLACES_COLLECTION).findOne(
      {
        $or: [
          { placeId: input.facility_id },
          { facility_id: input.facility_id },
        ],
      },
      {
        projection: {
          name: 1, capacity: 1, capacity_by_class: 1, address: 1,
          current_enrolled: 1, premium_subscribers: 1,
        },
      },
    ),
    !input.waiting_position
      ? db.collection<WaitlistSnapshotDoc>(U.WAITLIST_SNAPSHOTS)
          .findOne({ facility_id: input.facility_id }, { sort: { snapshot_date: -1 } })
      : Promise.resolve(null),
    readAdmissionBlocks(input.facility_id),
  ]);

  // If facility not in DB (e.g. heuristic:... synthetic ID), use regional defaults
  const resolvedFacility: PlaceDoc = facility ?? ({
    name: input.facility_id.startsWith('heuristic:')
      ? input.facility_id.slice('heuristic:'.length)
      : '어린이집',
    capacity: 60,
    address: '',
  } as PlaceDoc);

  return {
    db,
    facility: resolvedFacility,
    latestSnapshot,
    prebuiltBlocks,
  };
}

function normalizeAdmissionInput(
  input: AdmissionScoreInputV2,
  facility: PlaceDoc,
  latestSnapshot: WaitlistSnapshotDoc | null,
): NormalizedAdmissionData {
  const facilityName = facility.name ?? '어린이집';
  const capacity = toCapacity(facility.capacity);
  const address = facility.address ?? '';
  const region = extractRegionFromAddress(address) ?? 'default';
  const capacityByClass = toCapacityByClass(facility.capacity_by_class);

  const capacityEff = Math.max(
    1,
    capacityByClass[input.child_age_band] ??
      capacity * AGE_BAND_CAPACITY_RATIO[input.child_age_band],
  );

  let waitingPosition = input.waiting_position;
  if (!waitingPosition) {
    waitingPosition = latestSnapshot?.waitlist_by_class?.[input.child_age_band] ?? 0;
  }
  if (!waitingPosition) {
    waitingPosition = Math.round(capacityEff * 2);
  }

  const regionCompetition = REGION_COMPETITION[region] ?? 1.15;
  const priorityBonus = PRIORITY_BONUS[input.priority_type] ?? 0;
  const effectiveWaiting = Math.max(0, Math.ceil(waitingPosition * regionCompetition - priorityBonus));

  return {
    facilityName,
    region,
    capacityByClass,
    capacityEff,
    waitingPosition,
    effectiveWaiting,
  };
}

async function getCachedAdmissionResult(
  db: DbClient,
  input: AdmissionScoreInputV2,
  cacheKey: string,
): Promise<AdmissionScoreResultV2 | null> {
  try {
    const cached = await db.collection<AdmissionCacheDoc>(U.ADMISSION_CACHE).findOne({
      cacheKey,
      expireAt: { $gt: new Date() },
    });

    if (!cached) return null;

    const cachedOriginal = cached.waiting_position_original ?? 0;
    const inputOriginal = input.waiting_position ?? 0;
    if (Math.abs(cachedOriginal - inputOriginal) > 2) return null;

    const parsed = admissionScoreResultSchema.safeParse(cached.result);
    if (!parsed.success) return null;
    return parsed.data;
  } catch (err) {
    logger.debug('Cache miss or error', { cacheKey, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

async function calculateBayesianContext(
  db: DbClient,
  input: AdmissionScoreInputV2,
  prebuiltBlocks: PrebuiltBlocks,
  normalized: NormalizedAdmissionData,
): Promise<BayesianContext> {
  const vacancyBlock = prebuiltBlocks?.get('admission_vacancy_to');
  const priorMean = GAMMA_PRIOR_MEANS[normalized.region]?.[input.child_age_band]
    ?? GAMMA_PRIOR_MEANS.default[input.child_age_band];
  const ageBandNormalization: 'by_class' | 'total_facility' =
    normalized.capacityByClass[input.child_age_band] ? 'by_class' : 'total_facility';

  if (vacancyBlock && vacancyBlock.confidence >= 0.5) {
    const parsed = vacancyBlockDataSchema.safeParse(vacancyBlock.data);
    const data = parsed.success ? parsed.data : {};
    const N = data.N ?? 0;
    const ESeatMonths = data.E_seat_months ?? 0;
    const rhoObserved = data.rho_observed ?? 0;
    const alphaPost = data.alpha_post ?? 0.03;
    const betaPost = data.beta_post ?? 3;

    return {
      N,
      ESeatMonths,
      rhoObserved,
      alphaPost,
      betaPost,
      rhoPostMean: alphaPost / betaPost,
      snapshotCount: N > 0 ? 6 : 1,
      fromPrebuilt: true,
      prebuiltConfidence: vacancyBlock.confidence,
      priorMean,
      ageBandNormalization,
    };
  }

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const snapshots = await db
    .collection<WaitlistSnapshotDoc>(U.WAITLIST_SNAPSHOTS)
    .find({
      facility_id: input.facility_id,
      snapshot_date: { $gte: twelveMonthsAgo },
      change: { $exists: true },
    })
    .sort({ snapshot_date: 1 })
    .limit(500)
    .maxTimeMS(5000)
    .toArray();

  let N = 0;
  let ESeatMonths = 0;
  let pendingVacancies = 0;
  let lastEventStartTime: Date | null = null;

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];
    const prevDate = new Date(prev.snapshot_date);
    const currDate = new Date(curr.snapshot_date);

    const delta = curr.change?.enrolled_delta ?? 0;
    const isTO = curr.change?.to_detected === true;

    if (isTO && delta < 0) {
      if (pendingVacancies === 0) {
        lastEventStartTime = currDate;
      }
      pendingVacancies += Math.abs(delta);

      const hoursSinceEventStart = lastEventStartTime
        ? (currDate.getTime() - lastEventStartTime.getTime()) / (60 * 60 * 1000)
        : 0;

      if (hoursSinceEventStart >= EVENT_TIMEOUT_HOURS) {
        N += pendingVacancies;
        pendingVacancies = 0;
        lastEventStartTime = null;
      }
    } else if (delta >= 0 && pendingVacancies > 0) {
      N += pendingVacancies;
      pendingVacancies = 0;
      lastEventStartTime = null;
    }

    const deltaDays = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
    const deltaMonths = deltaDays / 30;
    ESeatMonths += normalized.capacityEff * deltaMonths;
  }

  if (pendingVacancies > 0) {
    N += pendingVacancies;
  }

  const rhoObserved = ESeatMonths > 0 ? N / ESeatMonths : 0;
  const alpha0 = priorMean * E0;
  const beta0 = E0;
  const alphaPost = alpha0 + N;
  const betaPost = beta0 + ESeatMonths;

  return {
    N,
    ESeatMonths,
    rhoObserved,
    alphaPost,
    betaPost,
    rhoPostMean: alphaPost / betaPost,
    snapshotCount: snapshots.length,
    fromPrebuilt: false,
    priorMean,
    ageBandNormalization,
  };
}

function createAdmissionProbabilityFn(
  effectiveWaiting: number,
  capacityEff: number,
  alphaPost: number,
  betaPost: number,
  currentMonth: number,
): (months: number) => number {
  return (months: number): number => {
    if (effectiveWaiting === 0) return 1.0;
    if (months <= 0) return 0;

    const effectiveMonths = effectiveHorizon(months, currentMonth);
    const expectedSeats = capacityEff * effectiveMonths;

    // When alpha is too small (heuristic/no-data), the NB distribution becomes
    // numerically unstable (NaN). Fall back to Poisson with national average rate.
    if (alphaPost < 1.0) {
      const lambda = HEURISTIC_VACANCY_RATE * expectedSeats;
      const poisson = (jStat as unknown as Record<string, { cdf(x: number, l: number): number }>).poisson;
      const rawCdf = poisson.cdf(effectiveWaiting - 1, lambda);
      if (!Number.isFinite(rawCdf)) return 0;
      return 1 - rawCdf;
    }

    const r = alphaPost;
    const p = betaPost / (betaPost + expectedSeats);
    validateNBParams(r, p);

    const rawCdf = jStat.negbin.cdf(effectiveWaiting - 1, r, p);
    if (!Number.isFinite(rawCdf)) return 0;
    return 1 - rawCdf;
  };
}

async function buildEvidenceCards(input: EvidenceBuildInput): Promise<EvidenceBuildOutput> {
  const { db, prebuiltBlocks, normalized, bayesian, currentMonth, scoreInput } = input;
  const evidenceCards: EvidenceCardV2[] = [];
  let alphaPost = bayesian.alphaPost;
  let betaPost = bayesian.betaPost;
  let rhoPostMean = bayesian.rhoPostMean;

  if (bayesian.fromPrebuilt) {
    evidenceCards.push({
      type: 'TO_SNAPSHOT',
      summary: `[프리빌트] TO ${bayesian.N}건 / ${bayesian.ESeatMonths.toFixed(1)} seat-months (ρ=${bayesian.rhoObserved.toFixed(4)})`,
      strength: calcStrength(bayesian.snapshotCount, bayesian.prebuiltConfidence ?? 0.5),
      data: {
        N: bayesian.N,
        E_seat_months: bayesian.ESeatMonths,
        rho_observed: bayesian.rhoObserved,
        method: 'gamma_posterior',
        alpha_post: bayesian.alphaPost,
        beta_post: bayesian.betaPost,
      },
    });
  } else if (bayesian.snapshotCount >= 2) {
    const conf = bayesian.snapshotCount >= 6 ? 0.85 : 0.55;
    evidenceCards.push({
      type: 'TO_SNAPSHOT',
      summary: `관측 ${bayesian.ESeatMonths.toFixed(1)} seat-months, TO ${bayesian.N}건 발생 (ρ=${bayesian.rhoObserved.toFixed(4)}/seat-month, 정원${Math.round(normalized.capacityEff)} 기준 월${(bayesian.rhoObserved * normalized.capacityEff).toFixed(1)}명)`,
      strength: calcStrength(bayesian.snapshotCount, conf),
      data: {
        N: bayesian.N,
        E_seat_months: bayesian.ESeatMonths,
        rho_observed: bayesian.rhoObserved,
        method: 'gamma_posterior',
        alpha_post: bayesian.alphaPost,
        beta_post: bayesian.betaPost,
        age_band_normalization: bayesian.ageBandNormalization,
      },
    });
  } else {
    evidenceCards.push({
      type: 'TO_SNAPSHOT',
      summary: `스냅샷 부족 (${bayesian.snapshotCount}건). 전국 평균 기반 추정 (vacancy_rate=${HEURISTIC_VACANCY_RATE}, E0=${E0})`,
      strength: calcStrength(1, 0.3),
      data: {
        N: 0,
        E_seat_months: 0,
        rho_observed: 0,
        method: 'gamma_prior',
        alpha_post: bayesian.alphaPost,
        beta_post: bayesian.betaPost,
      },
    });
  }

  const communitySignalBlock = prebuiltBlocks?.get('admission_community_signal');
  if (communitySignalBlock && communitySignalBlock.confidence >= 0.5) {
    const parsed = communitySignalDataSchema.safeParse(communitySignalBlock.data);
    if (parsed.success) {
      const data = parsed.data;
      const intelEnriched = data.intel_enriched ?? false;
      const intelSourceCount = data.intel_source_count ?? 0;
      const toMentionCount = data.to_mention_count ?? 0;

      if (intelEnriched && intelSourceCount >= 2) {
        if (toMentionCount > 0) {
          alphaPost += Math.min(toMentionCount * 0.3, 3);
          betaPost += Math.min(intelSourceCount * 0.5, 5);
          rhoPostMean = alphaPost / betaPost;
        }

        evidenceCards.push({
          type: 'COMMUNITY_AGGREGATE',
          summary: `커뮤니티 인텔 ${intelSourceCount}건 (TO언급 ${toMentionCount}건${data.avg_reported_wait_months ? `, 평균대기 ${data.avg_reported_wait_months}개월` : ''}${data.competition_level ? `, 경쟁 ${data.competition_level}` : ''})`,
          strength: calcStrength(intelSourceCount, communitySignalBlock.confidence),
          data: {
            total_sources: intelSourceCount,
            avg_wait_months: data.avg_reported_wait_months,
            groups: toMentionCount,
            avg_sentiment: data.avg_sentiment ?? 0,
            k_threshold: data.k_threshold ?? 3,
          },
        });
      }
    }
  }

  const monthsAhead = Array.from({ length: 6 }, (_, i) => ((currentMonth - 1 + i) % 12) + 1);
  const multipliers = monthsAhead.map((m) => SEASONAL_MULTIPLIER[m] ?? 1.0);
  const effectiveHorizon6m = effectiveHorizon(6, currentMonth);
  const expectedSeats6m = normalized.capacityEff * effectiveHorizon6m;

  evidenceCards.push({
    type: 'SEASONAL_FACTOR',
    summary: `${monthsAhead[0]}-${monthsAhead[5]}월 누적 강도 ${effectiveHorizon6m.toFixed(1)} (평균 ${(effectiveHorizon6m / 6).toFixed(2)}/월, ${currentMonth <= 3 ? '신학기 피크' : currentMonth >= 7 && currentMonth <= 9 ? '하반기 추가 모집기' : '일반 시기'})`,
    strength: 0.95,
    data: {
      months_ahead: monthsAhead,
      H_eff: effectiveHorizon6m,
      E_H: expectedSeats6m,
      multipliers,
    },
  });

  const hasCommunityIntelEvidence = evidenceCards.some((e) => e.type === 'COMMUNITY_AGGREGATE');
  if (!hasCommunityIntelEvidence) {
    const communityInsights = await db
      .collection<DataBlockDoc>(U.DATA_BLOCKS)
      .find({
        facility_id: scoreInput.facility_id,
        block_type: 'community_aggregate',
        confidence: { $gte: MIN_CONFIDENCE_FOR_COMMUNITY },
      })
      .toArray();

    const qualifiedInsights = communityInsights.filter(
      (c) => (c.source_count ?? 0) >= K_ANONYMITY_THRESHOLD,
    );

    if (qualifiedInsights.length > 0) {
      const totalSources = qualifiedInsights.reduce(
        (sum, c) => sum + (c.source_count ?? 0), 0,
      );
      const avgSentiment =
        qualifiedInsights.reduce(
          (sum, c) => sum + (c.features?.avg_sentiment ?? 0), 0,
        ) / qualifiedInsights.length;

      evidenceCards.push({
        type: 'COMMUNITY_AGGREGATE',
        summary: `익명 후기 신호 ${totalSources}건 집계 (k≥${K_ANONYMITY_THRESHOLD} 충족 ${qualifiedInsights.length}그룹, 평균 감성 ${avgSentiment > 0 ? '+' : ''}${avgSentiment.toFixed(2)})`,
        strength: calcStrength(totalSources, Math.min(0.8, 0.5 + qualifiedInsights.length * 0.05)),
        data: {
          groups: qualifiedInsights.length,
          total_sources: totalSources,
          avg_sentiment: avgSentiment,
          k_threshold: K_ANONYMITY_THRESHOLD,
        },
      });
    }
  }

  const evidenceProbability = createAdmissionProbabilityFn(
    normalized.effectiveWaiting,
    normalized.capacityEff,
    alphaPost,
    betaPost,
    currentMonth,
  );
  const evidenceP6m = evidenceProbability(6);
  const evidenceWaitMonthsMedian = findWaitMonthsInterpolated(0.5, evidenceProbability);

  // Use HEURISTIC_VACANCY_RATE for expected vacancies in heuristic mode (alphaPost < 1)
  const isHeuristic = bayesian.alphaPost < 1.0;
  const expectedVacancies6m = isHeuristic
    ? HEURISTIC_VACANCY_RATE * normalized.capacityEff * 6
    : rhoPostMean * normalized.capacityEff * 6;

  evidenceCards.push({
    type: 'SIMILAR_CASES',
    summary: `대기 순번 ${normalized.waitingPosition}번 (우선순위 보정 후 실질 ${normalized.effectiveWaiting}번), 예상 공석 ${expectedVacancies6m.toFixed(0)}명 (6개월)`,
    strength: calcStrength(bayesian.snapshotCount || 1, bayesian.snapshotCount >= 3 ? 0.75 : 0.4),
    data: {
      sample_size: bayesian.snapshotCount,
      avg_wait_months: evidenceWaitMonthsMedian,
      success_rate: evidenceP6m,
      definition: `${regionLabel(normalized.region)}/${scoreInput.child_age_band}세/정원${Math.round(normalized.capacityEff)}`,
    },
  });

  return {
    evidenceCards,
    alphaPost,
    betaPost,
    rhoPostMean,
  };
}

async function saveAdmissionCache(
  db: DbClient,
  cacheKey: string,
  input: AdmissionScoreInputV2,
  effectiveWaiting: number,
  result: AdmissionScoreResultV2,
): Promise<void> {
  try {
    await db.collection<AdmissionCacheDoc>(U.ADMISSION_CACHE).updateOne(
      { cacheKey },
      {
        $set: {
          cacheKey,
          result,
          facility_id: input.facility_id,
          child_age_band: input.child_age_band,
          priority_type: input.priority_type,
          waiting_position_original: input.waiting_position ?? 0,
          w_eff: effectiveWaiting,
          expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  } catch (err) {
    logger.warn('Cache write failed', { facilityId: input.facility_id, error: err instanceof Error ? err.message : String(err) });
  }
}

// ─── Core Engine ──────────────────────────────────────────────────

export async function calculateAdmissionScoreV2(
  input: AdmissionScoreInputV2,
): Promise<AdmissionScoreResultV2> {
  const fetched = await fetchAdmissionData(input);
  const normalized = normalizeAdmissionInput(input, fetched.facility, fetched.latestSnapshot);
  const cacheKey = getCacheKey(input, normalized.effectiveWaiting);

  const cachedResult = await getCachedAdmissionResult(fetched.db, input, cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const bayesian = await calculateBayesianContext(
    fetched.db,
    input,
    fetched.prebuiltBlocks,
    normalized,
  );

  const currentMonth = new Date().getMonth() + 1;
  const evidenceResult = await buildEvidenceCards({
    db: fetched.db,
    scoreInput: input,
    prebuiltBlocks: fetched.prebuiltBlocks,
    normalized,
    bayesian,
    currentMonth,
  });

  const admissionProbability = createAdmissionProbabilityFn(
    normalized.effectiveWaiting,
    normalized.capacityEff,
    evidenceResult.alphaPost,
    evidenceResult.betaPost,
    currentMonth,
  );
  const probability6m = admissionProbability(6);

  const rawScore = Math.round(100 * probability6m);
  const calibrated = (CALIBRATION_ARRAY[normalized.region] ?? CALIBRATION_ARRAY.default)[rawScore];
  const finalScore = clamp(calibrated, 1, 99);

  const variance = evidenceResult.alphaPost / (evidenceResult.betaPost ** 2);
  const mean = evidenceResult.alphaPost / evidenceResult.betaPost;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const rawConfidence = sigmoid(-cv * 3 + 1);
  // Heuristic/no-data mode: ensure a minimum confidence floor
  const confidence = Number(Math.max(
    evidenceResult.alphaPost < 1.0 ? MIN_HEURISTIC_CONFIDENCE : 0,
    rawConfidence,
  ).toFixed(2));

  const waitMonthsMedian = findWaitMonthsInterpolated(0.5, admissionProbability);
  const waitMonthsP80 = findWaitMonthsInterpolated(0.8, admissionProbability);

  const result: AdmissionScoreResultV2 = {
    probability: Number(probability6m.toFixed(4)),
    score: finalScore,
    grade: scoreToGrade(finalScore),
    confidence,
    waitMonths: {
      median: waitMonthsMedian,
      p80: waitMonthsP80,
    },
    effectiveWaiting: normalized.effectiveWaiting,
    posterior: {
      alpha: Number(evidenceResult.alphaPost.toFixed(4)),
      beta: Number(evidenceResult.betaPost.toFixed(4)),
    },
    evidenceCards: evidenceResult.evidenceCards,
    version: ENGINE_VERSION,
    asOf: new Date().toISOString(),
    facility_id: input.facility_id,
    facility_name: normalized.facilityName,
    region_key: normalized.region,
    isHeuristicMode: evidenceResult.alphaPost < 1.0,
  };

  await saveAdmissionCache(
    fetched.db,
    cacheKey,
    input,
    normalized.effectiveWaiting,
    result,
  );

  return result;
}

// ─── Bot Response Formatter ───────────────────────────────────────

export function formatBotResponseV2(result: AdmissionScoreResultV2): string {
  const lines: string[] = [];

  lines.push(
    `6개월 내 입학 확률 ${Math.round(result.probability * 100)}% (등급 ${result.grade}, 점수 ${result.score}, 신뢰도 ${Math.round(result.confidence * 100)}%)`,
  );
  lines.push('');
  lines.push('근거:');

  for (const ev of result.evidenceCards) {
    lines.push(`• ${ev.summary}`);
  }

  lines.push('');
  lines.push(
    `예상 대기기간: ${result.waitMonths.median}개월 (80% 확률 ${result.waitMonths.p80}개월 이내)`,
  );
  lines.push(`실질 대기순번: ${result.effectiveWaiting}번`);

  return lines.join('\n');
}
