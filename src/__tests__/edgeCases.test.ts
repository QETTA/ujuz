import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  objectIdSchema,
  communityPostQuerySchema,
  facilitySearchSchema,
  communityPostSchema,
  parseBody,
  parseQuery,
} from '../lib/server/validation';

// ── ObjectId boundary values ────────────────────────────

describe('ObjectId edge cases', () => {
  it('accepts minimum valid ObjectId (all zeros)', () => {
    expect(objectIdSchema.safeParse('000000000000000000000000').success).toBe(true);
  });

  it('accepts maximum valid ObjectId (all f)', () => {
    expect(objectIdSchema.safeParse('ffffffffffffffffffffffff').success).toBe(true);
  });

  it('accepts mixed case hex', () => {
    expect(objectIdSchema.safeParse('aAbBcCdDeEfF112233445566').success).toBe(true);
  });

  it('rejects 23-char string (one short)', () => {
    expect(objectIdSchema.safeParse('65a1f3d1f8b88c4b5e5f100').success).toBe(false);
  });

  it('rejects 25-char string (one long)', () => {
    expect(objectIdSchema.safeParse('65a1f3d1f8b88c4b5e5f10011').success).toBe(false);
  });

  it('ObjectId.isValid and objectIdSchema agree on valid', () => {
    const id = new ObjectId().toString();
    expect(objectIdSchema.safeParse(id).success).toBe(true);
    expect(ObjectId.isValid(id)).toBe(true);
  });
});

// ── Korean Unicode handling ─────────────────────────────

describe('Korean Unicode handling', () => {
  it('accepts Korean content in community posts', () => {
    const result = communityPostSchema.safeParse({
      type: 'review',
      content: '우리 어린이집 정말 좋아요! 선생님들이 친절하고 시설이 깨끗합니다. 🌟',
    });
    expect(result.success).toBe(true);
  });

  it('accepts Korean characters in facility search name', () => {
    const result = facilitySearchSchema.safeParse({
      name: '해피어린이집',
      sido: '서울특별시',
      sigungu: '강남구',
    });
    expect(result.success).toBe(true);
  });

  it('handles Korean with emoji and special chars', () => {
    const result = communityPostSchema.safeParse({
      type: 'question',
      content: '0세반 대기 중인데요... 😢 TO가 나올 확률이 얼마나 될까요? (현재 3번째)',
    });
    expect(result.success).toBe(true);
  });

  it('enforces max length correctly with multi-byte chars', () => {
    // Korean chars are multi-byte in UTF-8 but JS string length counts code units
    const longKorean = '가'.repeat(5001);
    const result = communityPostSchema.safeParse({
      type: 'review',
      content: longKorean,
    });
    expect(result.success).toBe(false);
  });

  it('allows exactly 5000 Korean chars', () => {
    const exactKorean = '가'.repeat(5000);
    const result = communityPostSchema.safeParse({
      type: 'review',
      content: exactKorean,
    });
    expect(result.success).toBe(true);
  });
});

// ── Date parsing edge cases ─────────────────────────────

describe('Date parsing edge cases', () => {
  it('parseQuery coerces string numbers to numbers', () => {
    const params = new URLSearchParams({ limit: '50' });
    const result = parseQuery(communityPostQuerySchema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(typeof result.data.limit).toBe('number');
    }
  });

  it('parseQuery handles empty search params with defaults', () => {
    const params = new URLSearchParams();
    const result = parseQuery(communityPostQuerySchema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.type).toBe('review');
    }
  });

  it('parseBody rejects null', () => {
    const result = parseBody(communityPostSchema, null);
    expect(result.success).toBe(false);
  });

  it('parseBody rejects undefined', () => {
    const result = parseBody(communityPostSchema, undefined);
    expect(result.success).toBe(false);
  });

  it('parseBody rejects string instead of object', () => {
    const result = parseBody(communityPostSchema, 'not an object');
    expect(result.success).toBe(false);
  });
});

// ── Number coercion ─────────────────────────────────────

describe('Number coercion edge cases', () => {
  it('facilitySearchSchema coerces string limit to number', () => {
    const result = facilitySearchSchema.safeParse({ limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects NaN for numeric fields', () => {
    const result = facilitySearchSchema.safeParse({ limit: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects negative limit', () => {
    const result = communityPostQuerySchema.safeParse({ limit: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects zero limit', () => {
    const result = communityPostQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });
});
