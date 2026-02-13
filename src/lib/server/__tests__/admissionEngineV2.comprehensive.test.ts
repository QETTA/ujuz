import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calcStrength,
  clamp,
  effectiveHorizon,
  findWaitMonthsInterpolated,
  getCacheKey,
  scoreToGrade,
  sigmoid,
  toAgeBandStr,
  validateNBParams,
} from '../admissionMath';
import {
  AGE_BAND_CAPACITY_RATIO,
  GRADE_BUCKETS_V2,
  GAMMA_PRIOR_MEANS,
  PRIORITY_BONUS,
  REGION_COMPETITION,
  SEASONAL_MULTIPLIER,
} from '../admissionParams';
import { buildActionsCard, computeUncertainty, mapLegacyEvidence } from '../admissionTypes';
import type { AdmissionScoreInputV2, EvidenceCardV2, EvidenceType } from '../admissionTypes';
import { LRUCache } from '../lruCache';

function makeScoreInput(overrides: Partial<AdmissionScoreInputV2> = {}): AdmissionScoreInputV2 {
  return {
    facility_id: 'facility-001',
    child_age_band: '2',
    priority_type: 'general',
    ...overrides,
  };
}

function makeLegacyEvidence(type: EvidenceType, strength: number): EvidenceCardV2 {
  return {
    type,
    summary: `${type} 근거`,
    strength,
    data: {},
  };
}

function expectedHorizon(months: number, currentMonth: number): number {
  let sum = 0;
  for (let i = 0; i < months; i++) {
    const m = ((currentMonth - 1 + i) % 12) + 1;
    sum += SEASONAL_MULTIPLIER[m] ?? 1;
  }
  return sum;
}

describe('admissionMath 단위 테스트', () => {
  describe('scoreToGrade', () => {
    it('점수 1은 F등급', () => {
      expect(scoreToGrade(1)).toBe('F');
    });

    it('점수 25는 E등급', () => {
      expect(scoreToGrade(25)).toBe('E');
    });

    it('점수 26은 E등급', () => {
      expect(scoreToGrade(26)).toBe('E');
    });

    it('점수 40은 D등급', () => {
      expect(scoreToGrade(40)).toBe('D');
    });

    it('점수 41은 D등급', () => {
      expect(scoreToGrade(41)).toBe('D');
    });

    it('점수 55는 C등급', () => {
      expect(scoreToGrade(55)).toBe('C');
    });

    it('점수 56은 C등급', () => {
      expect(scoreToGrade(56)).toBe('C');
    });

    it('점수 70은 B등급', () => {
      expect(scoreToGrade(70)).toBe('B');
    });

    it('점수 71은 B등급', () => {
      expect(scoreToGrade(71)).toBe('B');
    });

    it('점수 85는 A등급', () => {
      expect(scoreToGrade(85)).toBe('A');
    });

    it('점수 86은 A등급', () => {
      expect(scoreToGrade(86)).toBe('A');
    });

    it('점수 99는 A등급', () => {
      expect(scoreToGrade(99)).toBe('A');
    });

    it('점수 0은 F등급 경계값', () => {
      expect(scoreToGrade(0)).toBe('F');
    });

    it('점수 100은 A등급 경계 상단', () => {
      expect(scoreToGrade(100)).toBe('A');
    });

    it('점수 -1은 F등급', () => {
      expect(scoreToGrade(-1)).toBe('F');
    });

    it('점수 999도 A등급으로 처리', () => {
      expect(scoreToGrade(999)).toBe('A');
    });
  });

  describe('toAgeBandStr', () => {
    it('점수 0은 문자열 0으로 변환', () => {
      expect(toAgeBandStr(0)).toBe('0');
    });

    it('점수 1은 문자열 1으로 변환', () => {
      expect(toAgeBandStr(1)).toBe('1');
    });

    it('점수 2는 문자열 2으로 변환', () => {
      expect(toAgeBandStr(2)).toBe('2');
    });

    it('점수 3은 문자열 3으로 변환', () => {
      expect(toAgeBandStr(3)).toBe('3');
    });

    it('점수 4는 문자열 4로 변환', () => {
      expect(toAgeBandStr(4)).toBe('4');
    });

    it('점수 5는 문자열 5로 변환', () => {
      expect(toAgeBandStr(5)).toBe('5');
    });

    it('점수 -1은 잘못된 입력', () => {
      expect(() => toAgeBandStr(-1)).toThrow('Invalid age band');
    });

    it('점수 6은 잘못된 입력', () => {
      expect(() => toAgeBandStr(6)).toThrow('Invalid age band');
    });

    it('점수 1.5는 잘못된 입력', () => {
      expect(() => toAgeBandStr(1.5)).toThrow('Invalid age band');
    });

    it('점수 NaN은 잘못된 입력', () => {
      expect(() => toAgeBandStr(Number.NaN)).toThrow('Invalid age band');
    });
  });

  describe('clamp', () => {
    it('하한 미만은 하한으로 보정', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('상한 초과는 상한으로 보정', () => {
      expect(clamp(11, 0, 10)).toBe(10);
    });

    it('범위 안 값은 그대로 반환', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('경계값은 그대로 반환', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('sigmoid', () => {
    it('0은 0.5에 수렴', () => {
      expect(sigmoid(0)).toBeCloseTo(0.5, 10);
    });

    it('큰 양수는 1에 가까워짐', () => {
      expect(sigmoid(12)).toBeGreaterThan(0.9999);
    });

    it('큰 음수는 0에 가까워짐', () => {
      expect(sigmoid(-12)).toBeLessThan(0.0001);
    });
  });

  describe('effectiveHorizon', () => {
    it('H=6에서 월별 가중치 누적이 정상 동작', () => {
      for (let currentMonth = 1; currentMonth <= 12; currentMonth++) {
        expect(effectiveHorizon(6, currentMonth)).toBeCloseTo(expectedHorizon(6, currentMonth), 10);
      }
    });

    it('H=12에서 월별 가중치 누적이 정상 동작', () => {
      expect(effectiveHorizon(12, 3)).toBeCloseTo(expectedHorizon(12, 3), 10);
      expect(effectiveHorizon(12, 9)).toBeCloseTo(expectedHorizon(12, 9), 10);
      expect(effectiveHorizon(12, 12)).toBeCloseTo(expectedHorizon(12, 12), 10);
    });

    it('H=24에서 월별 가중치 누적이 정상 동작', () => {
      expect(effectiveHorizon(24, 1)).toBeCloseTo(expectedHorizon(24, 1), 10);
      expect(effectiveHorizon(24, 6)).toBeCloseTo(expectedHorizon(24, 6), 10);
      expect(effectiveHorizon(24, 11)).toBeCloseTo(expectedHorizon(24, 11), 10);
    });

    it('H가 0이거나 음수면 0', () => {
      expect(effectiveHorizon(0, 5)).toBe(0);
      expect(effectiveHorizon(-1, 5)).toBe(0);
    });
  });

  describe('getCacheKey', () => {
    it('캐시 키 포맷이 버전/시설/연령/가중치 포함', () => {
      const input = makeScoreInput({ facility_id: 'f-1', child_age_band: '3' });
      const key = getCacheKey(input, 12);
    expect(key).toMatch(/^v2\|f-1\|3\|12\|v2\.0\.0\|v1$/);
    });

    it('동일한 입력은 동일 캐시 키', () => {
      const input = makeScoreInput({ facility_id: 'f-same', child_age_band: '4' });
      const key1 = getCacheKey(input, 9);
      const key2 = getCacheKey(input, 9);
      expect(key1).toBe(key2);
    });

    it('시설 ID만 바뀌면 캐시 키도 변경', () => {
      const keyA = getCacheKey(makeScoreInput({ facility_id: 'f-a', child_age_band: '1' }), 10);
      const keyB = getCacheKey(makeScoreInput({ facility_id: 'f-b', child_age_band: '1' }), 10);
      expect(keyA).not.toBe(keyB);
    });

    it('연령대만 바뀌면 캐시 키도 변경', () => {
      const key0 = getCacheKey(makeScoreInput({ child_age_band: '0' }), 10);
      const key5 = getCacheKey(makeScoreInput({ child_age_band: '5' }), 10);
      expect(key0).not.toBe(key5);
    });

    it('w_eff만 바뀌면 캐시 키도 변경', () => {
      const input = makeScoreInput({ facility_id: 'f-w', child_age_band: '2' });
      const keySmall = getCacheKey(input, 1);
      const keyBig = getCacheKey(input, 99);
      expect(keySmall).not.toBe(keyBig);
    });
  });

  describe('findWaitMonthsInterpolated', () => {
    it('0개월에서 임계값 도달 시 0 반환', () => {
      const probFn = () => 1;
      expect(findWaitMonthsInterpolated(0.5, probFn)).toBe(0);
    });

    it('최대 horizon에서 임계값 미달이면 maxH 반환', () => {
      const probFn = () => 0.2;
      expect(findWaitMonthsInterpolated(0.9, probFn, 12)).toBe(12);
    });

    it('직선 함수에서 선형 보간이 동작', () => {
      const probFn = (H: number) => H * 0.2;
      expect(findWaitMonthsInterpolated(0.55, probFn)).toBe(2.8);
    });

  it('단계 함수에서 경계 구간 보간이 동작', () => {
      const probFn = (H: number) => {
        if (H < 3) return 0.1;
        return 0.8;
      };
      expect(findWaitMonthsInterpolated(0.5, probFn, 12)).toBe(2.6);
    });

    it('임계값이 0이면 0을 반환', () => {
      const probFn = () => 0;
      expect(findWaitMonthsInterpolated(0, probFn)).toBe(0);
    });
  });

  describe('calcStrength', () => {
    it('출처 0개는 강도 0', () => {
      expect(calcStrength(0, 0.8)).toBe(0);
      expect(calcStrength(0, 1)).toBe(0);
    });

    it('출처가 많고 신뢰도 높으면 1에 가까움', () => {
      expect(calcStrength(10, 1)).toBe(1);
      expect(calcStrength(6, 1)).toBe(1);
    });

    it('중간 신뢰도는 강도 반영', () => {
      expect(calcStrength(3, 0.6)).toBe(0.3);
    });
  });

  describe('validateNBParams', () => {
    it('유효 파라미터는 예외를 던지지 않음', () => {
      expect(() => validateNBParams(1.2, 0.5)).not.toThrow();
      expect(() => validateNBParams(0.1, 0.999)).not.toThrow();
    });

    it('r<=0은 invalid_nb_params 예외', () => {
      expect(() => validateNBParams(0, 0.5)).toThrow('NB parameter r must be > 0');
      expect(() => validateNBParams(-1, 0.5)).toThrow('NB parameter r must be > 0');
    });

    it('p<=0은 invalid_nb_params 예외', () => {
      expect(() => validateNBParams(1, 0)).toThrow('NB parameter p must be in (0,1)');
      expect(() => validateNBParams(1, -0.2)).toThrow('NB parameter p must be in (0,1)');
    });

    it('p>=1은 invalid_nb_params 예외', () => {
      expect(() => validateNBParams(1, 1)).toThrow('NB parameter p must be in (0,1)');
      expect(() => validateNBParams(1, 1.1)).toThrow('NB parameter p must be in (0,1)');
    });
  });
});

describe('admissionParams 상수 검증', () => {
  it('GRADE_BUCKETS_V2는 A~F 모든 등급 포함', () => {
    const grades = GRADE_BUCKETS_V2.map((bucket) => bucket.grade);
    expect(grades).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('GRADE_BUCKETS_V2는 minScore 내림차순 정렬', () => {
    for (let i = 0; i < GRADE_BUCKETS_V2.length - 1; i++) {
      expect(GRADE_BUCKETS_V2[i].minScore).toBeGreaterThanOrEqual(GRADE_BUCKETS_V2[i + 1].minScore);
    }
  });

  it('GRADE_BUCKETS_V2의 F는 0점, A는 85점', () => {
    const low = GRADE_BUCKETS_V2.find((bucket) => bucket.grade === 'F');
    const high = GRADE_BUCKETS_V2.find((bucket) => bucket.grade === 'A');
    expect(low?.minScore).toBe(0);
    expect(high?.minScore).toBe(85);
  });

  it('GAMMA_PRIOR_MEANS는 모든 값이 0 초과', () => {
    for (const region of Object.values(GAMMA_PRIOR_MEANS)) {
      for (const ratio of Object.values(region)) {
        expect(ratio).toBeGreaterThan(0);
      }
    }
  });

  it('GAMMA_PRIOR_MEANS는 모든 값이 1 이하', () => {
    for (const region of Object.values(GAMMA_PRIOR_MEANS)) {
      for (const ratio of Object.values(region)) {
        expect(ratio).toBeLessThanOrEqual(1);
      }
    }
  });

  it('REGION_COMPETITION은 12개 지역 항목 모두 1 이상', () => {
    for (const ratio of Object.values(REGION_COMPETITION)) {
      expect(ratio).toBeGreaterThanOrEqual(1);
    }
  });

  it('PRIORITY_BONUS는 일반 우선순위가 0', () => {
    expect(PRIORITY_BONUS.general).toBe(0);
  });

  it('PRIORITY_BONUS는 disability가 최댓값', () => {
    const max = Math.max(...Object.values(PRIORITY_BONUS));
    expect(PRIORITY_BONUS.disability).toBe(max);
  });

  it('SEASONAL_MULTIPLIER는 1~12월 모두 존재', () => {
    const months = Object.keys(SEASONAL_MULTIPLIER).map((k) => Number(k)).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('SEASONAL_MULTIPLIER의 입학 시즌(2월, 3월)이 최상단', () => {
    const values = Object.values(SEASONAL_MULTIPLIER);
    const sorted = [...values].sort((a, b) => b - a);
    expect(SEASONAL_MULTIPLIER[2]).toBe(sorted[1]);
    expect(SEASONAL_MULTIPLIER[3]).toBe(sorted[0]);
  });

  it('AGE_BAND_CAPACITY_RATIO 합계가 1에 근사', () => {
    const total = Object.values(AGE_BAND_CAPACITY_RATIO).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1.0, 9);
  });

  it('AGE_BAND_CAPACITY_RATIO에서 0세 대역이 최저 비율', () => {
    const zero = AGE_BAND_CAPACITY_RATIO['0'];
    const minimum = Math.min(...Object.values(AGE_BAND_CAPACITY_RATIO));
    expect(zero).toBe(minimum);
  });
});

describe('admissionTypes 매퍼 테스트', () => {
  it('mapLegacyEvidence는 TO_SNAPSHOT을 REGION_COMPETITION으로 변환', () => {
    const card = mapLegacyEvidence(makeLegacyEvidence('TO_SNAPSHOT', 0.6));
    expect(card.id).toBe('REGION_COMPETITION');
    expect(card.title).toBe('지역 경쟁도');
    expect(card.signals[0].name).toBe('TO_SNAPSHOT');
  });

  it('mapLegacyEvidence는 COMMUNITY_AGGREGATE를 COMMUNITY_SIGNAL로 변환', () => {
    const card = mapLegacyEvidence(makeLegacyEvidence('COMMUNITY_AGGREGATE', 0.6));
    expect(card.id).toBe('COMMUNITY_SIGNAL');
    expect(card.title).toBe('커뮤니티 신호');
    expect(card.signals[0].name).toBe('COMMUNITY_AGGREGATE');
  });

  it('mapLegacyEvidence는 SEASONAL_FACTOR를 SEASONALITY로 변환', () => {
    const card = mapLegacyEvidence(makeLegacyEvidence('SEASONAL_FACTOR', 0.6));
    expect(card.id).toBe('SEASONALITY');
    expect(card.title).toBe('시즌성');
    expect(card.signals[0].name).toBe('SEASONAL_FACTOR');
  });

  it('mapLegacyEvidence는 SIMILAR_CASES를 YOUR_POSITION로 변환', () => {
    const card = mapLegacyEvidence(makeLegacyEvidence('SIMILAR_CASES', 0.6));
    expect(card.id).toBe('YOUR_POSITION');
    expect(card.title).toBe('내 위치');
    expect(card.signals[0].name).toBe('SIMILAR_CASES');
  });

  it('증거 배열이 비어 있으면 빈 배열 결과', () => {
    const mapped: ReturnType<typeof mapLegacyEvidence>[] = [];
    const source: EvidenceCardV2[] = [];
    expect(source.map((evidence) => mapLegacyEvidence(evidence))).toEqual(mapped);
  });

  it('mapLegacyEvidence는 strength에 따라 신호 방향/강도를 매핑', () => {
    const positiveHigh = mapLegacyEvidence(makeLegacyEvidence('TO_SNAPSHOT', 0.9));
    expect(positiveHigh.signals[0].direction).toBe('POSITIVE');
    expect(positiveHigh.signals[0].strength).toBe('HIGH');

    const positiveMedium = mapLegacyEvidence(makeLegacyEvidence('TO_SNAPSHOT', 0.5));
    expect(positiveMedium.signals[0].direction).toBe('NEUTRAL');
    expect(positiveMedium.signals[0].strength).toBe('MEDIUM');

    const neutralLow = mapLegacyEvidence(makeLegacyEvidence('TO_SNAPSHOT', 0.2));
    expect(neutralLow.signals[0].direction).toBe('NEUTRAL');
    expect(neutralLow.signals[0].strength).toBe('LOW');
  });

  it('buildActionsCard는 A등급에서 선제 대응 카드 생성', () => {
    const card = buildActionsCard('A');
    expect(card.id).toBe('ACTIONS');
    expect(card.signals.some((signal) => signal.name.includes('TO 알림'))).toBe(true);
    expect(card.confidence).toBe('HIGH');
  });

  it('buildActionsCard는 F등급에서 보완 전략 카드 생성', () => {
    const card = buildActionsCard('F');
    expect(card.id).toBe('ACTIONS');
    expect(card.signals.some((signal) => signal.name.includes('지역 범위 확대'))).toBe(true);
    expect(card.signals[0].strength).toBe('HIGH');
  });

  it('computeUncertainty는 핵심 입력 완료 시 낮은 불확실성', () => {
    const result = computeUncertainty(12, false, 12, true);
    expect(result.band).toBe('LOW');
    expect(result.notes).toEqual(['핵심 입력 완비']);
  });

  it('computeUncertainty는 대기순번 미입력 시 높은 불확실성', () => {
    const result = computeUncertainty(undefined, false, 1, true);
    expect(result.band).toBe('HIGH');
    expect(result.notes).toContain('대기순번 미입력');
  });

  it('computeUncertainty는 표본 부족으로 불확실성 축소 없이 높게 유지', () => {
    const result = computeUncertainty(10, false, 4, true);
    expect(result.band).toBe('HIGH');
    expect(result.notes).toContain('표본 부족');
  });

  it('computeUncertainty는 표본 임계값 경계에서 정상 처리', () => {
    const none = computeUncertainty(10, false, 5, false);
    expect(none.band).toBe('MEDIUM');
    expect(none.notes).toContain('시설 shortlist 미지정');

    const waitRankLow = computeUncertainty(0, false, 5, true);
    const waitRankHigh = computeUncertainty(100, false, 5, true);
    expect(waitRankLow.band).toBe('LOW');
    expect(waitRankHigh.band).toBe('LOW');
  });
});

describe('LRUCache 동작 테스트', () => {
  let cache: LRUCache<number>;

  beforeEach(() => {
    cache = new LRUCache<number>({ maxSize: 3, ttlMs: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('기본 get/set이 동작한다', () => {
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('없는 키는 undefined를 반환', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('TTL 경과 후 값이 만료된다', () => {
    vi.useFakeTimers();
    cache.set('a', 1);
    vi.advanceTimersByTime(1200);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('TTL 이전에는 값이 유지된다', () => {
    vi.useFakeTimers();
    cache.set('a', 1);
    vi.advanceTimersByTime(900);
    expect(cache.get('a')).toBe(1);
    vi.advanceTimersByTime(50);
    expect(cache.get('a')).toBe(1);
  });

  it('최대 용량 초과 시 가장 오래된 항목부터 제거', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
    expect(cache.size).toBe(3);
  });

  it('최근에 사용한 항목은 제거되지 않는다', () => {
    const sizedCache = new LRUCache<number>({ maxSize: 2, ttlMs: 1000 });
    sizedCache.set('a', 1);
    sizedCache.set('b', 2);
    expect(sizedCache.get('a')).toBe(1);
    sizedCache.set('c', 3);

    expect(sizedCache.get('a')).toBe(1);
    expect(sizedCache.get('b')).toBeUndefined();
    expect(sizedCache.get('c')).toBe(3);
  });

  it('동일 키는 값이 갱신된다', () => {
    cache.set('a', 1);
    cache.set('a', 10);
    expect(cache.get('a')).toBe(10);
    expect(cache.size).toBe(1);
  });

  it('clear 호출 시 캐시가 비어진다', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('size는 현재 항목 수를 정확히 반영', () => {
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    expect(cache.size).toBe(1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
    cache.set('c', 3);
    expect(cache.size).toBe(3);
    cache.set('d', 4);
    expect(cache.size).toBe(3);
  });

  it('만료된 항목은 조회 시 정리된다', () => {
    vi.useFakeTimers();
    const shortTtlCache = new LRUCache<string>({ maxSize: 2, ttlMs: 100 });
    shortTtlCache.set('x', 'old');
    vi.advanceTimersByTime(120);
    expect(shortTtlCache.get('x')).toBeUndefined();
    expect(shortTtlCache.size).toBe(0);
  });

  it('가득 찬 캐시는 가장 오래된 항목이 제거되며 최신 항목은 유지', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
    expect(cache.get('c')).toBe(3);
  });

  it('TTL과 용량이 동시에 충돌해도 가장 최근이 남는다', () => {
    vi.useFakeTimers();
    cache.set('a', 1);
    cache.set('b', 2);
    vi.advanceTimersByTime(500);
    expect(cache.get('a')).toBe(1);

    cache.set('c', 3);
    cache.set('d', 4);

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('d')).toBe(4);
  });
});

describe('통합 패턴/행동 테스트', () => {
  it('캐시 키는 버전/시설/연령/가중치 정보를 반영한다', () => {
    const input = makeScoreInput({ facility_id: 'facility-itg-001', child_age_band: '1' });
    const key = getCacheKey(input, 42);
    expect(key.startsWith('v2|facility-itg-001|1|42|')).toBe(true);
    expect(key.includes('v2')).toBe(true);
  });

  it('시설 ID 변경은 캐시 키를 바꾼다', () => {
    const a = getCacheKey(makeScoreInput({ facility_id: 'A' }), 12);
    const b = getCacheKey(makeScoreInput({ facility_id: 'B' }), 12);
    expect(a).not.toBe(b);
  });

  it('연령대 변경은 캐시 키를 바꾼다', () => {
    const a = getCacheKey(makeScoreInput({ child_age_band: '0' }), 12);
    const b = getCacheKey(makeScoreInput({ child_age_band: '5' }), 12);
    expect(a).not.toBe(b);
  });

  it('동일 입력이면 캐시 키는 항상 동일', () => {
    const input = makeScoreInput({ facility_id: 'det', child_age_band: '2', priority_type: 'disability' });
    const first = getCacheKey(input, 33);
    const second = getCacheKey(input, 33);
    expect(first).toEqual(second);
  });

  it('scoreToGrade는 GRADE_BUCKETS_V2와 일치', () => {
    for (const score of [1, 24, 25, 40, 55, 70, 85, 99]) {
      const expected = GRADE_BUCKETS_V2.find((bucket) => score >= bucket.minScore)?.grade ?? 'F';
      expect(scoreToGrade(score)).toBe(expected);
    }
  });

  it('우선순위 가점은 대기순번을 감소시킨다', () => {
    const waiting = 60;
    const withoutBonus = waiting - PRIORITY_BONUS.general;
    const withBonus = waiting - PRIORITY_BONUS.disability;
    expect(withBonus).toBeLessThan(withoutBonus);
  });

  it('지역 경쟁도 계수는 실효 대기순번을 증가시킨다', () => {
    const waiting = 50;
    const normal = waiting * (REGION_COMPETITION.default ?? 1);
    const competitive = waiting * (REGION_COMPETITION.gangnam ?? 1);
    expect(competitive).toBeGreaterThan(normal);
  });

  it('시즌 멀티플라이어는 전망 월 수 계산에 반영된다', () => {
    expect(effectiveHorizon(6, 2)).toBeCloseTo(expectedHorizon(6, 2), 10);
    expect(effectiveHorizon(6, 10)).toBeCloseTo(expectedHorizon(6, 10), 10);
  });

  it('점수 1~99는 정확히 한 등급만 할당', () => {
    const mapped = new Set<string>();
    for (let score = 1; score <= 99; score++) {
      mapped.add(scoreToGrade(score));
    }

    expect(mapped.size).toBe(6);
    for (const bucket of GRADE_BUCKETS_V2) {
      expect(mapped.has(bucket.grade)).toBe(true);
    }
  });

  it('레거시 증거 유형은 표준 타입으로 모두 매핑 가능', () => {
    const mapped = [
      mapLegacyEvidence(makeLegacyEvidence('TO_SNAPSHOT', 0.5)).id,
      mapLegacyEvidence(makeLegacyEvidence('COMMUNITY_AGGREGATE', 0.5)).id,
      mapLegacyEvidence(makeLegacyEvidence('SEASONAL_FACTOR', 0.5)).id,
      mapLegacyEvidence(makeLegacyEvidence('SIMILAR_CASES', 0.5)).id,
    ];

    expect(new Set(mapped)).toEqual(new Set(['REGION_COMPETITION', 'COMMUNITY_SIGNAL', 'SEASONALITY', 'YOUR_POSITION']));
  });

  it('TO 알림 슬롯 산정에서 액션 카드가 항상 포함됨', () => {
    const actionCard = buildActionsCard('C');
    expect(actionCard.id).toBe('ACTIONS');
    expect(actionCard.signals).toHaveLength(3);
  });
});
