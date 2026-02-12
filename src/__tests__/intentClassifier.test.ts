import { describe, it, expect } from 'vitest';
import { classifyIntent, generateSuggestions, INTENT_KEYWORDS } from '../lib/server/intentClassifier';

// ─── classifyIntent ──────────────────────────────────────────

describe('classifyIntent', () => {
  it('classifies facility info keywords', () => {
    expect(classifyIntent('이 어린이집 정보 알려줘')).toBe('FACILITY_INFO');
    expect(classifyIntent('근처 유치원 어디야')).toBe('FACILITY_INFO');
  });

  it('classifies admission inquiry keywords', () => {
    expect(classifyIntent('입소 가능성 있나요')).toBe('ADMISSION_INQUIRY');
    expect(classifyIntent('대기 순번 몇 번이야?')).toBe('ADMISSION_INQUIRY');
  });

  it('classifies cost inquiry keywords', () => {
    expect(classifyIntent('보육료 얼마야?')).toBe('COST_INQUIRY');
    expect(classifyIntent('비용 궁금해요')).toBe('COST_INQUIRY');
  });

  it('classifies TO alert keywords', () => {
    expect(classifyIntent('빈자리 나면 알림 줘')).toBe('TO_ALERT');
    expect(classifyIntent('TO 알림 설정')).toBe('TO_ALERT');
  });

  it('classifies review inquiry keywords', () => {
    expect(classifyIntent('이 곳 후기 어때?')).toBe('REVIEW_INQUIRY');
    expect(classifyIntent('리뷰 보여줘')).toBe('REVIEW_INQUIRY');
  });

  it('classifies comparison keywords', () => {
    expect(classifyIntent('두 곳 비교해줘')).toBe('COMPARISON');
  });

  it('classifies recommendation keywords', () => {
    expect(classifyIntent('괜찮은 곳 추천해줘')).toBe('RECOMMENDATION');
  });

  it('classifies subscription keywords', () => {
    expect(classifyIntent('프리미엄 구독 하고싶어')).toBe('SUBSCRIPTION');
  });

  it('returns GENERAL for unrecognized messages', () => {
    expect(classifyIntent('안녕하세요')).toBe('GENERAL');
    expect(classifyIntent('오늘 날씨 좋다')).toBe('GENERAL');
    expect(classifyIntent('')).toBe('GENERAL');
  });

  it('is case-insensitive (lowercase matching)', () => {
    expect(classifyIntent('TO 알림')).toBe('TO_ALERT');
    expect(classifyIntent('to 알림')).toBe('TO_ALERT');
  });

  it('uses weighted scoring to pick the best-matching intent', () => {
    // "어린이집 입소 점수" has 2 ADMISSION_INQUIRY keywords (입소, 점수) vs 1 FACILITY_INFO (어린이집)
    const result = classifyIntent('어린이집 입소 점수');
    expect(result).toBe('ADMISSION_INQUIRY');
  });
});

// ─── generateSuggestions ─────────────────────────────────────

describe('generateSuggestions', () => {
  it('returns suggestions for known intents', () => {
    const suggestions = generateSuggestions('FACILITY_INFO');
    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach((s) => expect(typeof s).toBe('string'));
  });

  it('returns GENERAL suggestions for unknown intents', () => {
    const suggestions = generateSuggestions('UNKNOWN_INTENT');
    const generalSuggestions = generateSuggestions('GENERAL');
    expect(suggestions).toEqual(generalSuggestions);
  });

  it('returns different suggestions for different intents', () => {
    const facility = generateSuggestions('FACILITY_INFO');
    const admission = generateSuggestions('ADMISSION_INQUIRY');
    expect(facility).not.toEqual(admission);
  });
});

// ─── INTENT_KEYWORDS ─────────────────────────────────────────

describe('INTENT_KEYWORDS', () => {
  it('has no empty keyword arrays', () => {
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      expect(keywords.length, `${intent} should have keywords`).toBeGreaterThan(0);
    }
  });

  it('all keywords are non-empty strings', () => {
    for (const keywords of Object.values(INTENT_KEYWORDS)) {
      keywords.forEach((kw) => {
        expect(typeof kw).toBe('string');
        expect(kw.length).toBeGreaterThan(0);
      });
    }
  });
});
