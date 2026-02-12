import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/server/env', () => ({
  env: {
    MONGODB_URI: 'mongodb://test',
    MONGODB_DB_NAME: 'test',
    AUTH_SECRET: 'test-secret',
    ANTHROPIC_API_KEY: undefined,
  },
}));

vi.mock('../lib/server/db', () => ({
  getDbOrThrow: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}));

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/server/facility/facilityService', () => ({
  searchFacilities: vi.fn(),
  findNearbyFacilities: vi.fn(),
}));

vi.mock('../lib/server/admissionEngineV2', () => ({
  calculateAdmissionScoreV2: vi.fn(),
}));

import {
  ensureThreeReasons,
  extractReasons,
  enrichFacility,
  buildWeeklyActions,
  buildTemplateCopy,
  analyzeRoutes,
  type ScoredFacility,
  type RouteAnalysis,
} from '../lib/server/strategyEngine';
import type { AdmissionScoreResultV2 } from '../lib/server/admissionTypes';
import { getDbOrThrow } from '../lib/server/db';
import { findNearbyFacilities, searchFacilities } from '../lib/server/facility/facilityService';
import { calculateAdmissionScoreV2 } from '../lib/server/admissionEngineV2';
import { logger } from '../lib/server/logger';

function makeFacility(overrides: Partial<ScoredFacility['facility']> = {}): ScoredFacility['facility'] {
  return {
    id: 'f-1',
    provider_id: 'f-1',
    name: '행복어린이집',
    type: 'national_public',
    status: 'active',
    address: { full: '서울시 강남구', sido: '서울특별시', sigungu: '강남구' },
    capacity_total: 80,
    location: { lat: 37.5, lng: 127.0 },
    ...overrides,
  };
}

function makeResult(overrides: Partial<AdmissionScoreResultV2> = {}): AdmissionScoreResultV2 {
  return {
    probability: 0.72,
    score: 78,
    grade: 'B',
    confidence: 0.85,
    waitMonths: { median: 3, p80: 6 },
    effectiveWaiting: 12,
    posterior: { alpha: 2.5, beta: 1.2 },
    evidenceCards: [
      {
        type: 'TO_SNAPSHOT',
        summary: '최근 TO 2건 발생',
        strength: 0.8,
        data: { N: 2, rho_observed: 1.1, E_seat_months: 1 },
      },
    ],
    version: '2.0',
    asOf: '2025-01-15T09:00:00Z',
    facility_id: 'f-1',
    facility_name: '행복어린이집',
    region_key: 'gangnam',
    ...overrides,
  };
}

function makeRoute(overrides: Partial<RouteAnalysis> = {}): RouteAnalysis {
  return {
    route_id: 'public',
    scored: [],
    best: null,
    grade: 'LOW',
    reasons: ['r1', 'r2', 'r3'],
    enriched: [],
    ...overrides,
  };
}

describe('ensureThreeReasons', () => {
  it('returns 3 fallback reasons for empty input', () => {
    const reasons = ensureThreeReasons([], 'public', true);

    expect(reasons).toEqual([
      '주변 공공시설 데이터를 기준으로 분석했어요',
      '실시간 변동 가능성을 고려해 주세요',
      '알림 설정으로 변화에 빠르게 대응할 수 있어요',
    ]);
  });

  it('pads missing reasons when only one exists', () => {
    const reasons = ensureThreeReasons(['첫 번째 이유'], 'workplace', true);

    expect(reasons).toEqual([
      '첫 번째 이유',
      '회사 정보 입력 시 매칭 정확도가 올라가요',
      '공동직장 어린이집도 함께 탐색해 보세요',
    ]);
  });

  it('keeps only the first 3 reasons when input is longer', () => {
    const reasons = ensureThreeReasons(['a', 'b', 'c', 'd'], 'extended', true);

    expect(reasons).toEqual(['a', 'b', 'c']);
  });
});

describe('extractReasons', () => {
  it('builds evidence-based reasons from scored facilities', () => {
    const scored: ScoredFacility[] = [
      { facility: makeFacility({ provider_id: 'f-null' }), result: null },
      {
        facility: makeFacility({ provider_id: 'f-best' }),
        result: makeResult({
          probability: 0.734,
          grade: 'B',
          evidenceCards: [
            {
              type: 'TO_SNAPSHOT',
              summary: 'TO',
              strength: 0.7,
              data: { N: 4, rho_observed: 1.2, E_seat_months: 1 },
            },
            {
              type: 'COMMUNITY_AGGREGATE',
              summary: '커뮤니티',
              strength: 0.9,
              data: { total_sources: 12 },
            },
          ],
        }),
      },
    ];

    const reasons = extractReasons(scored, 'public', true);

    expect(reasons[0]).toBe('6개월 입소 확률 73% (B등급)');
    expect(reasons[1]).toBe('최근 TO 4건 발생 (월평균 1.2건)');
    expect(reasons[2]).toBe('커뮤니티 인텔 12건 반영');
  });
});

describe('enrichFacility', () => {
  it('creates chips from score, wait, and extended flags', () => {
    const enriched = enrichFacility(
      {
        facility: makeFacility({ extended_care: true }),
        result: makeResult({ probability: 0.42, waitMonths: { median: 3, p80: 7 } }),
      },
      'extended',
    );

    expect(enriched.chips).toEqual(['확률 42%', '대기 ~3개월', '연장 가능']);
  });

  it('adds workplace employer chip', () => {
    const enriched = enrichFacility(
      {
        facility: makeFacility({
          type: 'workplace',
          employer_name: '테스트회사',
          extended_care: false,
        }),
        result: makeResult({ probability: 0.5 }),
      },
      'workplace',
    );

    expect(enriched.chips).toContain('테스트회사');
  });
});

describe('buildWeeklyActions', () => {
  it('uses eligibility check action when employer is missing', () => {
    const routes: RouteAnalysis[] = [
      makeRoute({ route_id: 'public', grade: 'HIGH', scored: [{ facility: makeFacility(), result: makeResult({ score: 85 }) }] }),
      makeRoute({ route_id: 'workplace', grade: 'LOW', scored: [] }),
      makeRoute({ route_id: 'extended', grade: 'MEDIUM', scored: [] }),
    ];

    const actions = buildWeeklyActions(routes, false);

    expect(actions[1]).toEqual({
      key: 'docs',
      title: '직장 자격 확인',
      cta: '30초 체크',
      priority: 'HIGH',
    });
  });

  it('uses document checklist action when employer exists', () => {
    const routes: RouteAnalysis[] = [
      makeRoute({ route_id: 'public', grade: 'MEDIUM', scored: [{ facility: makeFacility(), result: makeResult({ score: 50 }) }] }),
      makeRoute({ route_id: 'workplace', grade: 'HIGH', scored: [{ facility: makeFacility(), result: makeResult({ score: 90 }) }] }),
      makeRoute({ route_id: 'extended', grade: 'LOW', scored: [] }),
    ];

    const actions = buildWeeklyActions(routes, true);

    expect(actions[1]).toEqual({
      key: 'docs',
      title: '증빙서류 체크',
      cta: '체크리스트',
      priority: 'HIGH',
    });
  });
});

describe('buildTemplateCopy', () => {
  it('returns default copy for HIGH', () => {
    const copy = buildTemplateCopy('HIGH');
    expect(copy).toEqual({
      one_liner: '루트가 열려 있어요. 지금 준비하세요.',
      disclaimer: '확률 기반 분석이며 실제 결과와 다를 수 있습니다.',
    });
  });

  it('returns default copy for MEDIUM', () => {
    const copy = buildTemplateCopy('MEDIUM');
    expect(copy.one_liner).toBe('가능성이 보여요. 전략적 접근이 필요해요.');
  });

  it('returns default copy for LOW', () => {
    const copy = buildTemplateCopy('LOW');
    expect(copy.one_liner).toBe('지금은 좁지만, 대안을 함께 찾아요.');
  });
});

describe('analyzeRoutes', () => {
  it('deduplicates score calls across routes and writes recommendation/checklist', async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    vi.mocked(getDbOrThrow).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ insertOne }),
    } as unknown as Awaited<ReturnType<typeof getDbOrThrow>>);

    const shared = makeFacility({
      id: 'shared-id',
      provider_id: 'shared-provider',
      type: 'workplace',
      extended_care: true,
    });

    vi.mocked(findNearbyFacilities)
      .mockResolvedValueOnce([shared])
      .mockResolvedValueOnce([shared])
      .mockResolvedValueOnce([shared]);
    vi.mocked(searchFacilities).mockResolvedValue({ facilities: [shared], next_cursor: null, has_more: false });
    vi.mocked(calculateAdmissionScoreV2).mockResolvedValue(makeResult({ facility_id: 'shared-provider' }));

    const rec = await analyzeRoutes({
      user_context: {
        home: { lat: 37.5, lng: 127 },
        work: { lat: 37.51, lng: 127.01 },
        child_age: '2',
        start_month: '2026-03',
        need_extended: true,
        employer: { name: '테스트', owner: 'self' },
      },
    }, 'user-1');

    expect(rec.widget.routes).toHaveLength(3);
    expect(insertOne).toHaveBeenCalledTimes(2);
    expect(calculateAdmissionScoreV2).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Strategy analyzeRoutes completed',
      expect.objectContaining({
        facilities_scored: 3,
        score_cache_hits: 2,
        score_cache_misses: 1,
      }),
    );

    const loggerPayload = vi.mocked(logger.info).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(loggerPayload).toBeDefined();
    expect(loggerPayload).not.toHaveProperty('userId');
  });
});
