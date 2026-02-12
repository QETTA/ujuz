import { describe, it, expect, vi } from 'vitest';

// Import pure math functions directly — no DB/env mocking needed
import { scoreToGrade, toAgeBandStr, findWaitMonthsInterpolated } from '../lib/server/admissionMath';

// ─── scoreToGrade ────────────────────────────────────────────

describe('scoreToGrade', () => {
  it('returns A for scores >= 85', () => {
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(99)).toBe('A');
    expect(scoreToGrade(100)).toBe('A');
  });

  it('returns B for scores 70-84', () => {
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(84)).toBe('B');
  });

  it('returns C for scores 55-69', () => {
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(69)).toBe('C');
  });

  it('returns D for scores 40-54', () => {
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(54)).toBe('D');
  });

  it('returns E for scores 25-39', () => {
    expect(scoreToGrade(25)).toBe('E');
    expect(scoreToGrade(39)).toBe('E');
  });

  it('returns F for scores < 25', () => {
    expect(scoreToGrade(0)).toBe('F');
    expect(scoreToGrade(24)).toBe('F');
    expect(scoreToGrade(1)).toBe('F');
  });

  it('handles boundary values exactly', () => {
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(84)).toBe('B');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(69)).toBe('C');
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(54)).toBe('D');
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(39)).toBe('E');
    expect(scoreToGrade(25)).toBe('E');
    expect(scoreToGrade(24)).toBe('F');
  });

  it('handles negative scores', () => {
    expect(scoreToGrade(-1)).toBe('F');
    expect(scoreToGrade(-100)).toBe('F');
  });
});

// ─── toAgeBandStr ────────────────────────────────────────────

describe('toAgeBandStr', () => {
  it('converts valid numeric age bands to strings', () => {
    expect(toAgeBandStr(0)).toBe('0');
    expect(toAgeBandStr(1)).toBe('1');
    expect(toAgeBandStr(2)).toBe('2');
    expect(toAgeBandStr(3)).toBe('3');
    expect(toAgeBandStr(4)).toBe('4');
    expect(toAgeBandStr(5)).toBe('5');
  });

  it('throws AppError for invalid age bands', () => {
    expect(() => toAgeBandStr(6)).toThrow('Invalid age band');
    expect(() => toAgeBandStr(-1)).toThrow('Invalid age band');
    expect(() => toAgeBandStr(99)).toThrow('Invalid age band');
  });

  it('throws for non-integer values', () => {
    expect(() => toAgeBandStr(1.5)).toThrow('Invalid age band');
    expect(() => toAgeBandStr(NaN)).toThrow('Invalid age band');
  });
});

// ─── findWaitMonthsInterpolated ──────────────────────────────

describe('findWaitMonthsInterpolated', () => {
  it('returns 0 when probability at H=0 meets threshold', () => {
    const probFn = () => 1.0;
    expect(findWaitMonthsInterpolated(0.5, probFn)).toBe(0);
  });

  it('returns maxH when threshold is never reached', () => {
    const probFn = () => 0.1;
    expect(findWaitMonthsInterpolated(0.5, probFn, 24)).toBe(24);
  });

  it('interpolates correctly between integer months', () => {
    // Linear: P(H) = H * 0.1
    const probFn = (H: number) => H * 0.1;
    // threshold 0.5 => should be at H = 5.0
    expect(findWaitMonthsInterpolated(0.5, probFn)).toBe(5);
  });

  it('interpolates fractional months', () => {
    // P(0)=0, P(1)=0.3, P(2)=0.7
    const probFn = (H: number) => {
      if (H === 0) return 0;
      if (H === 1) return 0.3;
      return 0.7;
    };
    // threshold 0.5 => between H=1 and H=2
    // fraction = (0.5 - 0.3) / (0.7 - 0.3) = 0.5
    // result = 1 + 0.5 = 1.5
    expect(findWaitMonthsInterpolated(0.5, probFn)).toBe(1.5);
  });

  it('handles step function (prevP === currP guard)', () => {
    // P(0)=0, P(1)=0, P(2)=1
    const probFn = (H: number) => (H >= 2 ? 1 : 0);
    // At H=2, prevP=0, currP=1, fraction = (0.5-0)/(1-0) = 0.5
    // result = 1 + 0.5 = 1.5
    expect(findWaitMonthsInterpolated(0.5, probFn)).toBe(1.5);
  });

  it('respects custom maxH', () => {
    const probFn = () => 0.1;
    expect(findWaitMonthsInterpolated(0.5, probFn, 12)).toBe(12);
    expect(findWaitMonthsInterpolated(0.5, probFn, 6)).toBe(6);
  });
});
