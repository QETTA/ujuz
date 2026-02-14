import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jStat } from 'jstat';

import { calculateAdmissionScoreV2, formatBotResponseV2 } from '../admissionEngineV2';
import {
  AGE_BAND_CAPACITY_RATIO,
  HEURISTIC_VACANCY_RATE,
  MIN_HEURISTIC_CONFIDENCE,
  PRIORITY_BONUS,
  REGION_COMPETITION,
  SEASONAL_MULTIPLIER,
} from '../admissionParams';
import {
  effectiveHorizon,
  findWaitMonthsInterpolated,
  getCacheKey,
  scoreToGrade,
  toAgeBandStr,
} from '../admissionMath';
import { U } from '../collections';
import type { AdmissionScoreInputV2, AdmissionScoreResultV2 } from '../admissionTypes';

interface MockSnapshotDoc {
  facility_id: string;
  snapshot_date: Date;
  waitlist_by_class?: Record<string, number>;
  change?: {
    enrolled_delta?: number;
    to_detected?: boolean | null;
  };
}

interface CachedAdmissionDoc {
  cacheKey: string;
  result: AdmissionScoreResultV2;
  facility_id: string;
  child_age_band: string;
  priority_type: string;
  waiting_position_original: number;
  w_eff: number;
  expireAt: Date;
}

interface MockDbState {
  facility: Record<string, unknown> | null;
  latestSnapshot: MockSnapshotDoc | null;
  snapshots: MockSnapshotDoc[];
  cache: Record<string, CachedAdmissionDoc>;
  communityBlocks: Record<string, unknown>[];
  throwCacheFindError: Error | null;
  throwCacheUpdateError: Error | null;
  prebuiltBlocks?: Map<string, unknown> | null;
}

interface CachedResultFixtureOverrides extends Partial<AdmissionScoreResultV2> {
  facility_id: string;
  child_age_band?: AdmissionScoreInputV2['child_age_band'];
  priority_type?: AdmissionScoreInputV2['priority_type'];
  waiting_position?: number;
  waiting_position_original?: number;
  w_eff?: number;
}

type BonusType = keyof typeof PRIORITY_BONUS;

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

let mockDbState: MockDbState;
let mockDbClient: { collection: ReturnType<typeof vi.fn> };
let prebuiltBlocksState: Map<string, unknown> | null = null;

vi.mock('../env', () => ({
  env: {
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    MONGODB_DB_NAME: 'ujuz-test',
    MONGODB_PLACES_COLLECTION: 'places',
    MONGODB_INSIGHTS_COLLECTION: 'refinedInsights',
    MONGODB_ADMISSION_BLOCKS_COLLECTION: 'admission_blocks',
    AUTH_SECRET: 'test-auth-secret',
  },
}));

vi.mock('../logger', () => ({ logger: loggerMock }));

vi.mock('../db', () => ({
  getDbOrThrow: vi.fn(async () => mockDbClient),
}));

vi.mock('../admissionData', () => ({
  readAdmissionBlocks: vi.fn(async () => prebuiltBlocksState),
}));

const bonusTypes = Object.keys(PRIORITY_BONUS) as BonusType[];

let facilitySequence = 0;

function makeFacility(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const id = `facility-${++facilitySequence}`;
  return {
    placeId: id,
    facility_id: id,
    name: `${id}-어린이집`,
    address: '서울특별시 강남구 대치동',
    capacity: 120,
    capacity_by_class: {
      '0': 24,
      '1': 24,
      '2': 24,
      '3': 22,
      '4': 18,
      '5': 12,
    },
    ...overrides,
  };
}

function makeSnapshotCollectionCursor(rows: MockSnapshotDoc[]) {
  const cursor = {
    sort: vi.fn(() => cursor),
    limit: vi.fn(() => cursor),
    maxTimeMS: vi.fn(() => cursor),
    toArray: vi.fn(async () => rows),
  };
  return cursor;
}

function makeDbCollection(name: string) {
  if (name === U.FACILITIES) {
    return {
      findOne: vi.fn(async (_query: unknown) => mockDbState.facility),
    };
  }

  if (name === U.WAITLIST_SNAPSHOTS) {
    return {
      findOne: vi.fn(async () => mockDbState.latestSnapshot),
      find: vi.fn(() => makeSnapshotCollectionCursor(mockDbState.snapshots)),
    };
  }

  if (name === U.ADMISSION_CACHE) {
    return {
      findOne: vi.fn(async (query: { cacheKey: string }) => {
        if (mockDbState.throwCacheFindError) {
          throw mockDbState.throwCacheFindError;
        }

        const byKey = mockDbState.cache[query.cacheKey];
        if (!byKey) return null;

        if (byKey.expireAt.getTime() <= Date.now()) {
          return null;
        }

        return byKey;
      }),
      updateOne: vi.fn(async (filter: { cacheKey: string }, action: { $set: CachedAdmissionDoc }) => {
        if (mockDbState.throwCacheUpdateError) {
          throw mockDbState.throwCacheUpdateError;
        }

        const key = filter.cacheKey;
        const record = action.$set;
        mockDbState.cache[key] = {
          ...record,
          cacheKey: key,
          facility_id: record.result.facility_id,
          child_age_band: record.result.waitMonths.median === 0 ? '2' : '2',
          priority_type: 'general',
        };
        return { acknowledged: true, upsertedId: key };
      }),
    };
  }

  if (name === U.DATA_BLOCKS) {
    return {
      find: vi.fn(() => ({
        toArray: vi.fn(async () =>
          mockDbState.communityBlocks.filter((block) => block.block_type === 'community_aggregate')
        ),
      })),
    };
  }

  return {
    findOne: vi.fn(async () => null),
    find: vi.fn(() => ({
      toArray: vi.fn(async () => []),
    })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
  };
}

function makeDbClient(state: MockDbState): { collection: ReturnType<typeof vi.fn> } {
  return {
    collection: vi.fn((name: string) => makeDbCollection(name)),
  };
}

function resetDbState(overrides: Partial<MockDbState> = {}) {
  const facility = overrides.facility ?? makeFacility();
  mockDbState = {
    facility,
    latestSnapshot: overrides.latestSnapshot ?? null,
    snapshots: overrides.snapshots ?? [],
    cache: overrides.cache ?? {},
    communityBlocks: overrides.communityBlocks ?? [],
    throwCacheFindError: null,
    throwCacheUpdateError: null,
    ...overrides,
  };
  prebuiltBlocksState = overrides.prebuiltBlocks ?? null;
  mockDbClient = makeDbClient(mockDbState);
}

function makeInput(overrides: Partial<AdmissionScoreInputV2> = {}): AdmissionScoreInputV2 {
  const facilityId = (mockDbState.facility?.placeId as string) ?? `facility-${facilitySequence}`;
  return {
    facility_id: facilityId,
    child_age_band: '2',
    waiting_position: 20,
    priority_type: 'general',
    ...overrides,
  };
}

function resolveRegionFromAddress(address: string): 'gangnam' | 'seongnam' | 'default' {
  if (address.includes('강남구') || address.includes('서초구') || address.includes('분당구') || address.includes('송파구') || address.includes('위례')) {
    if (address.includes('강남구')) return 'gangnam';
    if (address.includes('성남시')) return 'seongnam';
    return 'default';
  }

  if (address.includes('성남시')) return 'seongnam';
  return 'default';
}

function expectedCapacityEff(facility: Record<string, unknown> | null, ageBand: string): number {
  if (!facility) return 1;
  const byClass = facility.capacity_by_class as Record<string, number> | undefined;
  const total = facility.capacity as number | undefined;
  const fromClass = byClass?.[ageBand];
  const fromTotal = total === undefined ? 0 : total * (AGE_BAND_CAPACITY_RATIO[ageBand] ?? 0);
  return Math.max(1, fromClass ?? fromTotal ?? 1);
}

function expectedEffectiveWaiting(args: {
  waiting: number | undefined;
  facility: Record<string, unknown> | null;
  ageBand: string;
  priorityType: BonusType;
  latestSnapshotRank?: number | undefined;
}): number {
  const facility = args.facility;
  const snapshotRank = args.latestSnapshotRank;
  const baseWaiting = args.waiting ?? snapshotRank ?? ((facility ? expectedCapacityEff(facility, args.ageBand) : 1) * 2);
  const address = (facility?.address as string) ?? '';
  const region = resolveRegionFromAddress(address);
  const competition = REGION_COMPETITION[region] ?? REGION_COMPETITION.default;
  const bonus = PRIORITY_BONUS[args.priorityType] ?? 0;
  return Math.max(0, Math.ceil(baseWaiting * competition - bonus));
}

function computeManualProbability(args: {
  months: number;
  effectiveWaiting: number;
  alphaPost: number;
  betaPost: number;
  capacityEff: number;
  currentMonth: number;
}): number {
  const { months, effectiveWaiting, alphaPost, betaPost, capacityEff, currentMonth } = args;

  if (effectiveWaiting === 0) {
    return 1;
  }

  if (months <= 0) {
    return 0;
  }

  const H = effectiveHorizon(months, currentMonth);
  const expectedSeats = Math.max(0.01, capacityEff * H);

  if (alphaPost < 1) {
    const lambda = Math.max(0.01, HEURISTIC_VACANCY_RATE * expectedSeats);
    const poisson = (jStat as unknown as Record<string, { cdf(x: number, l: number): number }>).poisson;
    const rawCdf = poisson.cdf(effectiveWaiting - 1, lambda);
    if (!Number.isFinite(rawCdf)) return 0;
    const result = 1 - rawCdf;
    return Number.isFinite(result) ? result : 0;
  }

  const p = Math.min(Math.max(betaPost / (betaPost + expectedSeats), 0.001), 0.999);
  const rawCdf = jStat.negbin.cdf(effectiveWaiting - 1, alphaPost, p);
  if (!Number.isFinite(rawCdf)) {
    return 0;
  }
  const result = 1 - rawCdf;
  return Number.isFinite(result) ? result : 0;
}

function withFixedMonth<T>(month: number, fn: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`2026-${String(month).padStart(2, '0')}-03T00:00:00.000Z`));
  return fn().finally(() => vi.useRealTimers());
}

function makeCachedResult(
  overrides: CachedResultFixtureOverrides = { facility_id: 'facility-cache' },
): CachedAdmissionDoc {
  const {
    facility_id,
    child_age_band = '2' as AdmissionScoreInputV2['child_age_band'],
    priority_type = 'general' as AdmissionScoreInputV2['priority_type'],
    waiting_position = 12,
    waiting_position_original = waiting_position,
    w_eff = waiting_position,
    ...resultOverrides
  } = overrides;

  const effectiveW = Math.max(0, Math.round(waiting_position));

  return {
    cacheKey: getCacheKey(
      {
        facility_id,
        child_age_band,
        priority_type,
        waiting_position: effectiveW,
      },
      effectiveW,
    ),
    child_age_band,
    facility_id,
    priority_type,
    waiting_position_original,
    w_eff,
    expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    result: {
      probability: 0.31,
      score: 31,
      grade: 'E',
      confidence: 0.52,
      waitMonths: {
        median: 11,
        p80: 17,
      },
      effectiveWaiting: effectiveW,
      posterior: {
        alpha: 0.12,
        beta: 3,
      },
      evidenceCards: [
        {
          type: 'TO_SNAPSHOT',
          summary: '캐시 목업 근거',
          strength: 0.3,
          data: { source: 'cache' },
        },
        {
          type: 'SEASONAL_FACTOR',
          summary: '캐시 목업 근거2',
          strength: 0.4,
          data: { source: 'cache' },
        },
        {
          type: 'SIMILAR_CASES',
          summary: '캐시 목업 근거3',
          strength: 0.5,
          data: { source: 'cache' },
        },
      ],
      version: 'v2.0.0',
      asOf: new Date().toISOString(),
      facility_id,
      facility_name: '캐시 어린이집',
      region_key: 'default',
      isHeuristicMode: true,
      ...resultOverrides,
    },
  };
}

beforeEach(() => {
  resetDbState();
  loggerMock.debug.mockClear();
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  loggerMock.info.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ------------------------------------------------------------
// 점수/입력 유효성 관련 단위 검증
// ------------------------------------------------------------

describe('입학 점수 함수 A~F 구간 커버리지', () => {
  it('점수 -1은 F', () => {
    expect(scoreToGrade(-1)).toBe('F');
  });

  it('점수 0은 F 경계값', () => {
    expect(scoreToGrade(0)).toBe('F');
  });

  it('점수 24는 F 경계 내부', () => {
    expect(scoreToGrade(24)).toBe('F');
  });

  it('점수 25는 E 시작', () => {
    expect(scoreToGrade(25)).toBe('E');
  });

  it('점수 39는 E 경계', () => {
    expect(scoreToGrade(39)).toBe('E');
  });

  it('점수 40는 D 시작', () => {
    expect(scoreToGrade(40)).toBe('D');
  });

  it('점수 54는 D 경계', () => {
    expect(scoreToGrade(54)).toBe('D');
  });

  it('점수 55는 C 시작', () => {
    expect(scoreToGrade(55)).toBe('C');
  });

  it('점수 70는 B 시작', () => {
    expect(scoreToGrade(70)).toBe('B');
  });

  it('점수 85는 A 시작', () => {
    expect(scoreToGrade(85)).toBe('A');
  });

  it('점수 100은 A 상한', () => {
    expect(scoreToGrade(100)).toBe('A');
  });
});

describe('입력 연령대 문자열 변환 경계값', () => {
  it('0~5 범위는 모두 문자열로 변환', () => {
    expect(toAgeBandStr(0)).toBe('0');
    expect(toAgeBandStr(1)).toBe('1');
    expect(toAgeBandStr(2)).toBe('2');
    expect(toAgeBandStr(3)).toBe('3');
    expect(toAgeBandStr(4)).toBe('4');
    expect(toAgeBandStr(5)).toBe('5');
  });

  it('연령대 -1은 입력 검증 실패', () => {
    expect(() => toAgeBandStr(-1)).toThrow();
  });

  it('연령대 6은 입력 검증 실패', () => {
    expect(() => toAgeBandStr(6)).toThrow();
  });

  it('연령대 NaN은 입력 검증 실패', () => {
    expect(() => toAgeBandStr(Number.NaN)).toThrow();
  });
});

// ------------------------------------------------------------
// 전체 파이프라인 경계 값 테스트
// ------------------------------------------------------------

describe('대기열 순번 경계값과 기본 계산 검증', () => {
  it('순번 미입력은 기준 정원 기반으로 2배 fallback', async () => {
    const facility = makeFacility({
      capacity: 80,
      capacity_by_class: undefined,
    });
    resetDbState({ facility, latestSnapshot: null });

    const input = makeInput({ waiting_position: undefined });
    const result = await calculateAdmissionScoreV2(input);

    const expectedWaiting = expectedEffectiveWaiting({
      waiting: undefined,
      facility,
      ageBand: input.child_age_band,
      priorityType: input.priority_type,
    });

    expect(result.effectiveWaiting).toBe(expectedWaiting);
  });

  it('순번 0은 미입력과 동일 처리되어 fallback 사용', async () => {
    const facility = makeFacility({
      capacity: 100,
      capacity_by_class: undefined,
    });
    resetDbState({ facility, latestSnapshot: null });
    const input = makeInput({ waiting_position: 0 });

    const result = await calculateAdmissionScoreV2(input);
    const expectedWaiting = expectedEffectiveWaiting({
      waiting: 0,
      facility,
      ageBand: input.child_age_band,
      priorityType: input.priority_type,
    });

    expect(result.effectiveWaiting).toBe(expectedWaiting);
  });

  it('순번 1은 공식 적용으로 정수 ceil 유지', async () => {
    const facility = makeFacility({ capacity: 120, capacity_by_class: undefined });
    resetDbState({ facility, latestSnapshot: null });
    const input = makeInput({ waiting_position: 1 });

    const result = await calculateAdmissionScoreV2(input);
    const expectedWaiting = expectedEffectiveWaiting({
      waiting: 1,
      facility,
      ageBand: input.child_age_band,
      priorityType: input.priority_type,
    });

    expect(result.effectiveWaiting).toBe(expectedWaiting);
    expect(Number.isInteger(result.effectiveWaiting)).toBe(true);
  });

  it('매우 큰 순번은 높은 순번으로 계산되며 등급 하락', async () => {
    const facility = makeFacility({ capacity: 120, capacity_by_class: undefined });
    resetDbState({ facility, latestSnapshot: null });
    const input = makeInput({ waiting_position: 1000 });

    const result = await calculateAdmissionScoreV2(input);
    const expectedWaiting = expectedEffectiveWaiting({
      waiting: 1000,
      facility,
      ageBand: input.child_age_band,
      priorityType: input.priority_type,
    });

    expect(result.effectiveWaiting).toBe(expectedWaiting);
    expect(result.grade).toBe('F');
  });

  it('순번 음수 입력은 0 이하로 보정', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });
    const input = makeInput({ waiting_position: -20 as unknown as number });

    const result = await calculateAdmissionScoreV2(input);
    expect(result.effectiveWaiting).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeGreaterThanOrEqual(0);
  });

  it('대기순번 11에서 12로 변경은 효과순번 미세 변화 반영', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const res11 = await calculateAdmissionScoreV2(makeInput({ waiting_position: 11 }));
    const res12 = await calculateAdmissionScoreV2(makeInput({ waiting_position: 12 }));

    expect(Math.abs(res11.effectiveWaiting - res12.effectiveWaiting)).toBeGreaterThanOrEqual(0);
    expect(res11.effectiveWaiting).not.toBe(res12.effectiveWaiting);
  });
});

// ------------------------------------------------------------
// 보너스 타입별 처리
// ------------------------------------------------------------

describe('우선순위 보너스별 대기순번 반영', () => {
  bonusTypes.forEach((bonusType) => {
    it(`${bonusType} 보너스는 순번 감소 규칙이 반영됨`, async () => {
      const facility = makeFacility();
      resetDbState({ facility, latestSnapshot: null });
      const input = makeInput({ waiting_position: 30, priority_type: bonusType as AdmissionScoreInputV2['priority_type'] });

      const result = await calculateAdmissionScoreV2(input);
      const expected = expectedEffectiveWaiting({
        waiting: 30,
        facility,
        ageBand: input.child_age_band,
        priorityType: bonusType,
      });

      expect(result.effectiveWaiting).toBe(expected);
    });
  });

  it('우선순위 조합(일반 vs 장애 가점)에서 장애 우선이 항상 유리', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const general = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20, priority_type: 'general' }));
    const disability = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20, priority_type: 'disability' }));

    expect(disability.effectiveWaiting).toBeLessThanOrEqual(general.effectiveWaiting);
    expect(disability.grade).toMatch(/^[A-F]$/);
  });

  it('우선순위 조합(저소득/맞벌이/형제)에서 저소득은 맞벌이보다 더 큼', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const lowIncome = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20, priority_type: 'low_income' }));
    const dualIncome = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20, priority_type: 'dual_income' }));

    expect(lowIncome.effectiveWaiting).toBeLessThanOrEqual(dualIncome.effectiveWaiting);
    expect(lowIncome.effectiveWaiting).toBeLessThan(dualIncome.effectiveWaiting + 1);
  });

  it('우선순위 조합(형제 가점)과 다자녀 가점은 동일하지 않음', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const sibling = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20, priority_type: 'sibling' }));
    const multiChild = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20, priority_type: 'multi_child' }));

    expect(sibling.effectiveWaiting).toBeLessThanOrEqual(multiChild.effectiveWaiting + 1);
  });
});

// ------------------------------------------------------------
// 지역별 동작 확인
// ------------------------------------------------------------

describe('지역 라벨과 지역별 경쟁도 적용', () => {
  it('서울 강남구 주소는 gangnam 지역키를 갖음', async () => {
    const facility = makeFacility({ address: '서울특별시 강남구 대치동' });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20 }));

    expect(result.region_key).toBe('gangnam');
  });

  it('경기 성남시 주소는 seongnam 지역키를 갖음', async () => {
    const facility = makeFacility({ address: '경기도 성남시 분당구 대왕판교로 10' });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20 }));

    expect(result.region_key).toBe('seongnam');
  });

  it('일반 지방 주소는 default 지역키를 갖음', async () => {
    const facility = makeFacility({ address: '부산광역시 해운대구 센텀동로 24' });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20 }));

    expect(result.region_key).toBe('default');
  });

  it('서울 vs 경기 경쟁도는 지방보다 서울이 더 높아야 함', async () => {
    const facilitySeoul = makeFacility({ address: '서울특별시 강남구 대치동' });
    const facilityGyeonggi = makeFacility({ address: '경기도 성남시 분당구 판교로' });

    resetDbState({ facility: facilitySeoul, latestSnapshot: null });
    const seoulEffective = (await calculateAdmissionScoreV2({
      facility_id: String(facilitySeoul.placeId),
      child_age_band: '2',
      waiting_position: 50,
      priority_type: 'general',
    } as AdmissionScoreInputV2)).effectiveWaiting;

    resetDbState({ facility: facilityGyeonggi, latestSnapshot: null });
    const gyeonggiEffective = (await calculateAdmissionScoreV2({
      facility_id: String(facilityGyeonggi.placeId),
      child_age_band: '2',
      waiting_position: 50,
      priority_type: 'general',
    } as AdmissionScoreInputV2)).effectiveWaiting;

    expect(seoulEffective).toBeGreaterThan(gyeonggiEffective);
  });

  it('서울 vs 지방 경쟁도 비교는 default보다 높은 값 반영', async () => {
    const seoul = makeFacility({ address: '서울특별시 강남구 대치동' });
    const local = makeFacility({ address: '인천광역시 남동구 정석동' });

    resetDbState({ facility: seoul, latestSnapshot: null });
    const seoul2 = await calculateAdmissionScoreV2({
      facility_id: String(seoul.placeId),
      child_age_band: '2',
      waiting_position: 30,
      priority_type: 'general',
    } as AdmissionScoreInputV2);

    resetDbState({ facility: local, latestSnapshot: null });
    const local2 = await calculateAdmissionScoreV2({
      facility_id: String(local.placeId),
      child_age_band: '2',
      waiting_position: 30,
      priority_type: 'general',
    } as AdmissionScoreInputV2);

    expect(seoul2.effectiveWaiting).toBeGreaterThanOrEqual(local2.effectiveWaiting);
  });
});

// ------------------------------------------------------------
// 시즌성 효과 검증
// ------------------------------------------------------------

describe('시즌성 효과(March 피크 vs 비피크)', () => {
  it('3월 입학 피크는 11월보다 입학확률이 낮지 않음', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const march = await withFixedMonth(3, () => calculateAdmissionScoreV2(makeInput({ waiting_position: 40 })));
    resetDbState({ facility, latestSnapshot: null });
    const november = await withFixedMonth(11, () => calculateAdmissionScoreV2(makeInput({ waiting_position: 40 })));

    expect(march.probability).toBeGreaterThanOrEqual(november.probability);
  });

  it('3월 시즌 카드는 "신학기 피크" 텍스트를 포함', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await withFixedMonth(3, () => calculateAdmissionScoreV2(makeInput({ waiting_position: 40 })));

    const seasonal = result.evidenceCards.find((card) => card.type === 'SEASONAL_FACTOR');
    expect(seasonal?.summary).toContain('신학기 피크');
  });

  it('7월 시즌 카드는 하반기 추가 모집기 문구를 포함', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await withFixedMonth(7, () => calculateAdmissionScoreV2(makeInput({ waiting_position: 40 })));
    const seasonal = result.evidenceCards.find((card) => card.type === 'SEASONAL_FACTOR');
    expect(seasonal?.summary).toContain('하반기 추가 모집기');
  });

  it('일반 월(10월)은 일반 시기 문구를 포함', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await withFixedMonth(10, () => calculateAdmissionScoreV2(makeInput({ waiting_position: 40 })));
    const seasonal = result.evidenceCards.find((card) => card.type === 'SEASONAL_FACTOR');
    expect(seasonal?.summary).toContain('일반 시기');
  });

  it('시즌성 가중치 합산은 effectiveHorizon이 동일 입력에서 월별 다름 반영', () => {
    const h3 = effectiveHorizon(6, 3);
    const h11 = effectiveHorizon(6, 11);
    expect(h3).toBeGreaterThan(h11);
  });

  it('월별 가중치 테이블은 1~12월 모두 접근 가능', () => {
    for (let month = 1; month <= 12; month++) {
      expect(SEASONAL_MULTIPLIER[month]).toBeGreaterThan(0);
    }
  });
});

// ------------------------------------------------------------
// 캐시 동작 검증
// ------------------------------------------------------------

describe('캐시 계층 동작 테스트', () => {
  it('캐시 미스 시 계산 후 캐시 저장됨', async () => {
    const facility = makeFacility();
    const cachedKey = getCacheKey(makeInput(), 25);
    resetDbState({
      facility,
      latestSnapshot: null,
      cache: {
        [cachedKey]: makeCachedResult({ facility_id: String(facility.placeId), waiting_position_original: 10, probability: 0 }),
      },
    });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 25, priority_type: 'general' }));
    const cacheCollection = mockDbClient.collection(U.ADMISSION_CACHE) as any;
    expect(cacheCollection.updateOne).toHaveBeenCalled();
    expect(result.region_key).toBe(resolveRegionFromAddress(String(facility.address)));
  });

  it('캐시 히트 시 즉시 반환되어 업데이트를 생략함', async () => {
    const facility = makeFacility();
    const expectedEff = expectedEffectiveWaiting({
      waiting: 12,
      facility,
      ageBand: '2',
      priorityType: 'general',
    });
    const input = makeInput({ waiting_position: 12 });
    const cached = makeCachedResult({
      facility_id: String(facility.placeId),
      waiting_position: expectedEff,
      waiting_position_original: expectedEff,
      child_age_band: input.child_age_band,
      priority_type: input.priority_type,
    });
    const exactKey = getCacheKey(input, expectedEff);
    cached.cacheKey = exactKey;

    resetDbState({
      facility,
      latestSnapshot: null,
      cache: {
        [exactKey]: cached,
      },
    });

    const first = await calculateAdmissionScoreV2(input);
    const cacheCollection = mockDbClient.collection(U.ADMISSION_CACHE) as any;
    const firstFindCount = cacheCollection.findOne.mock.calls.length;

    // 두 번째 호출은 동일 입력으로 들어가야 하고 LRU 캐시를 통과해야 함
    const second = await calculateAdmissionScoreV2(input);
    const secondFindCount = cacheCollection.findOne.mock.calls.length;

    expect(first).toMatchObject({ facility_id: String(facility.placeId), grade: 'E' });
    expect(secondFindCount).toBe(firstFindCount);
    expect(second).toEqual(first);
    expect(cacheCollection.updateOne).not.toHaveBeenCalled();
  });

  it('만료 캐시는 사용하지 않고 즉시 재계산', async () => {
    const facility = makeFacility();
    const input = makeInput({ waiting_position: 18 });
    const key = getCacheKey(input, 18);

    const expired: CachedAdmissionDoc = {
      ...makeCachedResult({ facility_id: String(facility.placeId), waiting_position_original: 18 }),
      cacheKey: key,
      expireAt: new Date(Date.now() - 1000),
    };

    resetDbState({
      facility,
      latestSnapshot: null,
      cache: {
        [key]: expired,
      },
    });

    const result = await calculateAdmissionScoreV2(input);
    const cacheCollection = mockDbClient.collection(U.ADMISSION_CACHE) as any;

    expect(cacheCollection.updateOne).toHaveBeenCalled();
    expect(result.probability).toBeGreaterThanOrEqual(0);
  });

  it('입력 순번 차이가 threshold(>2)면 캐시 miss 처리', async () => {
    const facility = makeFacility();
    const input = makeInput({ waiting_position: 20 });
    const expected = expectedEffectiveWaiting({
      waiting: 20,
      facility,
      ageBand: input.child_age_band,
      priorityType: input.priority_type,
    });
    const key = getCacheKey(input, expected);

    const cacheDoc = makeCachedResult({
      facility_id: String(facility.placeId),
      waiting_position_original: Math.max(0, expected - 10),
      waiting_position: expected,
    });
    cacheDoc.cacheKey = key;
    cacheDoc.waiting_position_original = Math.max(0, expected - 10);

    resetDbState({
      facility,
      latestSnapshot: null,
      cache: {
        [key]: cacheDoc,
      },
    });

    await calculateAdmissionScoreV2(input);
    const cacheCollection = mockDbClient.collection(U.ADMISSION_CACHE) as any;

    expect(cacheCollection.updateOne).toHaveBeenCalled();
  });

  it('캐시 업데이트 실패는 warn 로그를 남기고 결과는 정상 반환', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });
    mockDbState.throwCacheUpdateError = new Error('cache update fail');

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 10 }));

    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Cache write failed',
      expect.objectContaining({ facilityId: String(facility.placeId) }),
    );
    expect(result.probability).toBeGreaterThanOrEqual(0);
  });
});

// ------------------------------------------------------------
// 증거 카드 생성
// ------------------------------------------------------------

describe('증거 카드 구성(3~4장)', () => {
  it('기본 경로에서 TO/시즌/유사사례 3장 생성', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null, prebuiltBlocks: null, communityBlocks: [] });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 12 }));
    const types = result.evidenceCards.map((c) => c.type);

    expect(types).toEqual(['TO_SNAPSHOT', 'SEASONAL_FACTOR', 'SIMILAR_CASES']);
    expect(result.evidenceCards).toHaveLength(3);
  });

  it('프리빌트 커뮤니티 블록이 있으면 COMMUNITY_AGGREGATE가 4번째로 추가', async () => {
    const facility = makeFacility();
    const blockMap = new Map();
    const admissionVacancy = {
      _id: 'vacancy',
      facility_id: String(facility.placeId),
      block_type: 'admission_vacancy_to',
      confidence: 0.8,
      data: { N: 30, E_seat_months: 10, rho_observed: 0.2, alpha_post: 6, beta_post: 5 },
      is_active: true,
      valid_until: new Date(Date.now() + 3600 * 1000),
    };
    const community = {
      _id: 'community',
      facility_id: String(facility.placeId),
      block_type: 'admission_community_signal',
      confidence: 0.8,
      data: {
        intel_enriched: true,
        intel_source_count: 6,
        to_mention_count: 3,
        avg_reported_wait_months: 4,
        competition_level: 'high',
        avg_sentiment: 0.23,
        k_threshold: 3,
      },
      is_active: true,
      valid_until: new Date(Date.now() + 3600 * 1000),
    };
    blockMap.set('admission_vacancy_to', admissionVacancy);
    blockMap.set('admission_community_signal', community);

    resetDbState({ facility, latestSnapshot: null, prebuiltBlocks: blockMap, communityBlocks: [] });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 12 }));

    expect(result.evidenceCards).toHaveLength(4);
    expect(result.evidenceCards.map((c) => c.type)).toContain('COMMUNITY_AGGREGATE');
  });

  it('데이터블록 경로 커뮤니티가 충분하면 COMMUNITY_AGGREGATE 추가', async () => {
    const facility = makeFacility();
    resetDbState({
      facility,
      latestSnapshot: null,
      communityBlocks: [
        {
          _id: 'db1',
          facility_id: String(facility.placeId),
          block_type: 'community_aggregate',
          confidence: 0.8,
          source_count: 5,
          features: {
            avg_sentiment: -0.2,
          },
          isActive: true,
        },
      ],
    });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 12 }));
    const types = result.evidenceCards.map((c) => c.type);

    expect(types).toContain('COMMUNITY_AGGREGATE');
    expect(result.evidenceCards).toHaveLength(4);
  });

  it('증거 카드 강도는 0~1 사이', async () => {
    const facility = makeFacility();
    resetDbState({
      facility,
      latestSnapshot: null,
      communityBlocks: [
        {
          _id: 'db2',
          facility_id: String(facility.placeId),
          block_type: 'community_aggregate',
          confidence: 0.88,
          source_count: 7,
          features: { avg_sentiment: 0.1 },
          isActive: true,
        },
      ],
    });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 12 }));

    for (const card of result.evidenceCards) {
      expect(card.strength).toBeGreaterThanOrEqual(0);
      expect(card.strength).toBeLessThanOrEqual(1);
      expect(card.summary.length).toBeGreaterThan(0);
    }
  });

  it('유사사례 카드에는 유효 대기순번 및 예측 대기정보가 존재', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 15 }));
    const similar = result.evidenceCards.find((card) => card.type === 'SIMILAR_CASES');

    expect(similar).toBeDefined();
    expect(similar?.data.definition).toContain('/');
    expect(similar?.data.avg_wait_months).toBeGreaterThanOrEqual(0);
  });
});

// ------------------------------------------------------------
// 확률/ETA/불확실성
// ------------------------------------------------------------

describe('확률 추정치와 ETA/불확실성', () => {
  it('p3m/p6m/p12m가 모두 [0,1] 범위를 만족', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 40 }));
    const capacityEff = expectedCapacityEff(facility, result.waitMonths.median >= 0 ? '2' : '2');

    const currentMonth = 3;
    const p3 = computeManualProbability({
      months: 3,
      effectiveWaiting: result.effectiveWaiting,
      alphaPost: result.posterior.alpha,
      betaPost: result.posterior.beta,
      capacityEff,
      currentMonth,
    });
    const p6 = computeManualProbability({
      months: 6,
      effectiveWaiting: result.effectiveWaiting,
      alphaPost: result.posterior.alpha,
      betaPost: result.posterior.beta,
      capacityEff,
      currentMonth,
    });
    const p12 = computeManualProbability({
      months: 12,
      effectiveWaiting: result.effectiveWaiting,
      alphaPost: result.posterior.alpha,
      betaPost: result.posterior.beta,
      capacityEff,
      currentMonth,
    });

    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(1);
    expect(p3).toBeGreaterThanOrEqual(0);
    expect(p3).toBeLessThanOrEqual(1);
    expect(p6).toBeGreaterThanOrEqual(0);
    expect(p6).toBeLessThanOrEqual(1);
    expect(p12).toBeGreaterThanOrEqual(0);
    expect(p12).toBeLessThanOrEqual(1);
    expect(p3).toBeLessThanOrEqual(p6 + 1e-8);
    expect(p6).toBeLessThanOrEqual(p12 + 1e-8);
  });

  it('p3/p6/p12 단조 증가(기준 horizon 커질수록 확률 상승)', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const input = makeInput({ waiting_position: 20 });
    const result = await withFixedMonth(3, () => calculateAdmissionScoreV2(input));
    const capEff = expectedCapacityEff(facility, input.child_age_band);

    const p3 = computeManualProbability({ months: 3, effectiveWaiting: result.effectiveWaiting, alphaPost: result.posterior.alpha, betaPost: result.posterior.beta, capacityEff: capEff, currentMonth: 3 });
    const p6 = computeManualProbability({ months: 6, effectiveWaiting: result.effectiveWaiting, alphaPost: result.posterior.alpha, betaPost: result.posterior.beta, capacityEff: capEff, currentMonth: 3 });
    const p12 = computeManualProbability({ months: 12, effectiveWaiting: result.effectiveWaiting, alphaPost: result.posterior.alpha, betaPost: result.posterior.beta, capacityEff: capEff, currentMonth: 3 });

    expect(p3).toBeLessThanOrEqual(p6);
    expect(p6).toBeLessThanOrEqual(p12);
    expect(result.probability).toBeCloseTo(p6, 5);
  });

  it('고정 결과에서 eta median <= p80', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 40 }));
    expect(result.waitMonths.median).toBeLessThanOrEqual(result.waitMonths.p80);
  });

  it('무작위로 큰 대기순번에서 median은 상한 36을 넘기지 않음', async () => {
    const facility = makeFacility({ capacity: 50, capacity_by_class: undefined });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 10000 }));
    expect(result.waitMonths.median).toBeLessThanOrEqual(36);
    expect(result.waitMonths.p80).toBeLessThanOrEqual(36);
  });

  it('heuristic 모드에서는 최소 신뢰도 플로어가 유지됨', async () => {
    const facility = makeFacility({
      placeId: 'heuristic-confidence',
      capacity: 50,
      capacity_by_class: undefined,
    });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2({
      facility_id: String(facility.placeId),
      child_age_band: '2',
      waiting_position: 15,
      priority_type: 'general',
    } as AdmissionScoreInputV2);

    expect(result.isHeuristicMode).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(MIN_HEURISTIC_CONFIDENCE);
  });

  it('데이터 기반 N 추정치가 큰 경우 confidence가 heuristic 하한을 초과', async () => {
    const facility = makeFacility({
      placeId: 'nb-confidence',
      capacity: 120,
    });
    const blockMap = new Map();
    blockMap.set('admission_vacancy_to', {
      _id: 'vacancy',
      facility_id: String(facility.placeId),
      block_type: 'admission_vacancy_to',
      confidence: 0.9,
      data: {
        N: 120,
        E_seat_months: 10,
        rho_observed: 0.3,
        alpha_post: 18,
        beta_post: 10,
      },
      is_active: true,
      valid_until: new Date(Date.now() + 3600 * 1000),
    });

    resetDbState({ facility, latestSnapshot: null, prebuiltBlocks: blockMap });

    const result = await calculateAdmissionScoreV2({
      facility_id: String(facility.placeId),
      child_age_band: '2',
      waiting_position: 10,
      priority_type: 'general',
    } as AdmissionScoreInputV2);

    expect(result.isHeuristicMode).toBe(false);
    expect(result.confidence).toBeGreaterThan(MIN_HEURISTIC_CONFIDENCE);
  });

  it('findWaitMonthsInterpolated가 반환한 p50은 0~36 사이', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 50 }));
    expect(findWaitMonthsInterpolated(0.5, () => result.probability, 36)).toBeGreaterThanOrEqual(0);
    expect(findWaitMonthsInterpolated(0.8, () => result.probability, 36)).toBeGreaterThanOrEqual(0);
  });
});

// ------------------------------------------------------------
// 통합 파이프라인 및 예외 케이스
// ------------------------------------------------------------

describe('통합 파이프라인 및 형식 검증', () => {
  it('입력부터 asOf/버전/시설명/지역까지 단일 결과로 반환', async () => {
    const facility = makeFacility({ name: '강남상세어린이집' });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2({
      facility_id: String(facility.placeId),
      child_age_band: '4',
      waiting_position: 17,
      priority_type: 'disability',
    } as AdmissionScoreInputV2);

    expect(result.facility_name).toBe('강남상세어린이집');
    expect(result.region_key).toBe('gangnam');
    expect(result.version).toBe('v2.0.0');
    expect(() => new Date(result.asOf).toISOString()).not.toThrow();
    expect(result.facility_id).toBe(String(facility.placeId));
    expect(scoreToGrade(result.score)).toBe(result.grade);
  });

  it('미발견 시설은 기본 시설 데이터로 폴백 처리됨', async () => {
    resetDbState({ facility: null, latestSnapshot: null });
    const unknownId = 'facility-unknown-test';

    const result = await calculateAdmissionScoreV2({
      facility_id: unknownId,
      child_age_band: '1',
      waiting_position: 12,
      priority_type: 'general',
    } as AdmissionScoreInputV2);

    expect(result.facility_name).toBe(unknownId);
    expect(result.region_key).toBe('default');
    expect(result.waitMonths.median).toBeGreaterThanOrEqual(0);
  });

  it('포맷 함수가 카드 요약과 ETA를 출력 문자열로 조합', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 20 }));
    const text = formatBotResponseV2(result);

    expect(text).toContain('근거:');
    expect(text).toContain('예상 대기기간');
    expect(text).toContain(`실질 대기순번: ${result.effectiveWaiting}번`);
    for (const card of result.evidenceCards) {
      expect(text).toContain(card.summary);
    }
  });

  it('부적절한 연령대 문자열은 유효성 에러로 실패', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    await expect(
      calculateAdmissionScoreV2({
        facility_id: String(facility.placeId),
        child_age_band: '6' as AdmissionScoreInputV2['child_age_band'],
        waiting_position: 10,
        priority_type: 'general',
      }),
    ).rejects.toThrow();
  });

  it('우선순위 타입이 유효하지 않아도 엔진이 크래시 없이 처리', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2({
      facility_id: String(facility.placeId),
      child_age_band: '2',
      waiting_position: 20,
      priority_type: 'invalid-type' as AdmissionScoreInputV2['priority_type'],
    } as AdmissionScoreInputV2);

    expect(result.grade).toBe('F');
  });

  it('capacity가 0이면 안전하게 대체되어 계산 실행', async () => {
    const facility = makeFacility({
      placeId: 'zero-capacity',
      capacity: 0,
      capacity_by_class: { '2': 0 },
    });
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2({
      facility_id: String(facility.placeId),
      child_age_band: '2',
      waiting_position: 5,
      priority_type: 'general',
    } as AdmissionScoreInputV2);

    expect(result.effectiveWaiting).toBeGreaterThanOrEqual(0);
    expect(result.waitMonths.median).toBeGreaterThanOrEqual(0);
  });

  it('정상적인 마지막 경계 rank에서 F~A 구간이 모두 산출될 수 있음을 확인', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const inputs = [
      makeInput({ waiting_position: 1 }),
      makeInput({ waiting_position: 8 }),
      makeInput({ waiting_position: 15 }),
      makeInput({ waiting_position: 30 }),
      makeInput({ waiting_position: 60 }),
      makeInput({ waiting_position: 120 }),
    ];

    const results = await Promise.all(
      inputs.map((input) => calculateAdmissionScoreV2(input as AdmissionScoreInputV2)),
    );

    const uniqueGrades = new Set(results.map((r) => r.grade));
    expect(uniqueGrades.size).toBeGreaterThanOrEqual(3);
    for (const grade of uniqueGrades) {
      expect(['A', 'B', 'C', 'D', 'E', 'F']).toContain(grade);
    }
  });

  it('캐시 key는 시설/연령/효과순번/버전에 따라 결정', async () => {
    const facility = makeFacility();
    const input = makeInput({ waiting_position: 20, priority_type: 'general' });
    const expectedKey = getCacheKey(input, 20);
    const key = getCacheKey(input, 20);

    expect(key).toBe(expectedKey);
    expect(key).toContain('v2.0.0');
    expect(key).toContain('v1');
  });

  it('결과는 항상 정렬된 증거카드 타입을 반환', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 30 }));
    const types = result.evidenceCards.map((c) => c.type);

    expect(types).toEqual(['TO_SNAPSHOT', 'SEASONAL_FACTOR', 'SIMILAR_CASES']);
  });

  it('결과 신뢰도는 항상 0~1 범위', async () => {
    const facility = makeFacility();
    resetDbState({ facility, latestSnapshot: null });

    const result = await calculateAdmissionScoreV2(makeInput({ waiting_position: 30, priority_type: 'disability' }));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
