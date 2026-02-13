import { describe, it, expect } from 'vitest';
import {
  objectIdSchema,
  anonIdSchema,
  communityPostQuerySchema,
  communityPostUpdateSchema,
  toAlertDeleteQuerySchema,
  toAlertPatchSchema,
  toAlertUnreadQuerySchema,
  checklistPatchSchema,
  overrideListQuerySchema,
  facilityOverrideSchema,
  parseBody,
  parseQuery,
} from '../lib/server/validation';

// ── objectIdSchema ──────────────────────────────────────

describe('objectIdSchema', () => {
  it('accepts valid 24-char hex', () => {
    expect(objectIdSchema.safeParse('65a1f3d1f8b88c4b5e5f1001').success).toBe(true);
  });

  it('rejects short string', () => {
    expect(objectIdSchema.safeParse('123').success).toBe(false);
  });

  it('rejects 24 chars with non-hex', () => {
    expect(objectIdSchema.safeParse('zzzzzzzzzzzzzzzzzzzzzzzz').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(objectIdSchema.safeParse('').success).toBe(false);
  });
});

// ── anonIdSchema ────────────────────────────────────────

describe('anonIdSchema', () => {
  it('accepts word characters, dashes, colons, dots', () => {
    expect(anonIdSchema.parse('user-123:abc.def')).toBe('user-123:abc.def');
  });

  it('falls back to anonymous on invalid chars', () => {
    expect(anonIdSchema.parse('<script>alert(1)</script>')).toBe('anonymous');
  });

  it('falls back to anonymous on empty string', () => {
    expect(anonIdSchema.parse('')).toBe('anonymous');
  });
});

// ── communityPostQuerySchema ────────────────────────────

describe('communityPostQuerySchema', () => {
  it('applies defaults', () => {
    const result = communityPostQuerySchema.parse({});
    expect(result.region).toBe('');
    expect(result.type).toBe('review');
    expect(result.sort).toBe('recent');
    expect(result.limit).toBe(20);
  });

  it('validates cursor as ObjectId', () => {
    const result = communityPostQuerySchema.safeParse({ cursor: 'not-an-id' });
    expect(result.success).toBe(false);
  });

  it('accepts valid cursor', () => {
    const result = communityPostQuerySchema.safeParse({ cursor: '65a1f3d1f8b88c4b5e5f1001' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = communityPostQuerySchema.safeParse({ type: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('clamps limit', () => {
    const result = communityPostQuerySchema.safeParse({ limit: '999' });
    expect(result.success).toBe(false);
  });
});

// ── communityPostUpdateSchema ───────────────────────────

describe('communityPostUpdateSchema', () => {
  it('accepts partial update (content only)', () => {
    const result = communityPostUpdateSchema.safeParse({ content: 'updated text' });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = communityPostUpdateSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (no-op update)', () => {
    const result = communityPostUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── toAlertDeleteQuerySchema ────────────────────────────

describe('toAlertDeleteQuerySchema', () => {
  it('requires facility_id', () => {
    expect(toAlertDeleteQuerySchema.safeParse({}).success).toBe(false);
  });

  it('accepts valid facility_id', () => {
    const result = toAlertDeleteQuerySchema.safeParse({ facility_id: 'fac_123' });
    expect(result.success).toBe(true);
  });
});

// ── toAlertPatchSchema ──────────────────────────────────

describe('toAlertPatchSchema', () => {
  it('requires facility_id and active boolean', () => {
    expect(toAlertPatchSchema.safeParse({}).success).toBe(false);
    expect(toAlertPatchSchema.safeParse({ facility_id: 'f1' }).success).toBe(false);
    expect(toAlertPatchSchema.safeParse({ facility_id: 'f1', active: 'yes' }).success).toBe(false);
  });

  it('accepts valid input', () => {
    const result = toAlertPatchSchema.safeParse({ facility_id: 'f1', active: true });
    expect(result.success).toBe(true);
  });
});

// ── toAlertUnreadQuerySchema ────────────────────────────

describe('toAlertUnreadQuerySchema', () => {
  it('applies default limit', () => {
    const result = toAlertUnreadQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it('accepts valid ISO since', () => {
    const result = toAlertUnreadQuerySchema.safeParse({ since: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid since', () => {
    const result = toAlertUnreadQuerySchema.safeParse({ since: 'not-a-date' });
    expect(result.success).toBe(false);
  });
});

// ── checklistPatchSchema ────────────────────────────────

describe('checklistPatchSchema', () => {
  it('requires all fields', () => {
    expect(checklistPatchSchema.safeParse({}).success).toBe(false);
    expect(checklistPatchSchema.safeParse({ recommendation_id: 'r1' }).success).toBe(false);
  });

  it('accepts valid input', () => {
    const result = checklistPatchSchema.safeParse({
      recommendation_id: 'rec1',
      item_key: 'k1',
      done: true,
    });
    expect(result.success).toBe(true);
  });
});

// ── overrideListQuerySchema ─────────────────────────────

describe('overrideListQuerySchema', () => {
  it('applies default limit', () => {
    const result = overrideListQuerySchema.parse({});
    expect(result.limit).toBe(50);
  });

  it('validates facility_id as ObjectId', () => {
    const result = overrideListQuerySchema.safeParse({ facility_id: 'not-hex' });
    expect(result.success).toBe(false);
  });
});

// ── facilityOverrideSchema field_path allowlist ─────────

describe('facilityOverrideSchema field_path allowlist', () => {
  const validPaths = ['name', 'type', 'status', 'address.sido', 'address.sigungu', 'phone', 'capacity_total', 'capacity_current', 'extended_care', 'operating_hours.weekday', 'employer_name', 'employer_id'];
  const blockedPaths = ['_id', 'provider', 'raw_hash', 'location', 'created_at', 'updated_at', 'provider_id'];

  for (const path of validPaths) {
    it(`allows field_path: "${path}"`, () => {
      const result = facilityOverrideSchema.safeParse({ field_path: path, new_value: 'v', reason: 'test' });
      expect(result.success).toBe(true);
    });
  }

  for (const path of blockedPaths) {
    it(`blocks field_path: "${path}"`, () => {
      const result = facilityOverrideSchema.safeParse({ field_path: path, new_value: 'v', reason: 'test' });
      expect(result.success).toBe(false);
    });
  }
});

// ── parseQuery helper ───────────────────────────────────

describe('parseQuery', () => {
  it('parses URLSearchParams into schema', () => {
    const params = new URLSearchParams({ limit: '10', type: 'question' });
    const result = parseQuery(communityPostQuerySchema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.type).toBe('question');
    }
  });

  it('returns error for invalid params', () => {
    const params = new URLSearchParams({ type: 'invalid_type' });
    const result = parseQuery(communityPostQuerySchema, params);
    expect(result.success).toBe(false);
  });
});
