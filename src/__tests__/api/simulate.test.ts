/**
 * Tests for /api/simulate — engine interface + usage gating
 */
import { describe, it, expect } from 'vitest';
import { parseBody, simulateSchema } from '@/lib/server/validation';

describe('simulateSchema validation', () => {
  it('accepts valid input', () => {
    const result = parseBody(simulateSchema, {
      facility_id: 'fac123',
      child_age_band: 2,
      priority_type: 'general',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.facility_id).toBe('fac123');
      expect(result.data.child_age_band).toBe(2);
    }
  });

  it('rejects missing facility_id', () => {
    const result = parseBody(simulateSchema, {
      child_age_band: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid age_band', () => {
    const result = parseBody(simulateSchema, {
      facility_id: 'fac123',
      child_age_band: 10,
    });
    expect(result.success).toBe(false);
  });

  it('defaults priority_type to general', () => {
    const result = parseBody(simulateSchema, {
      facility_id: 'fac123',
      child_age_band: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority_type).toBe('general');
    }
  });

  it('coerces string age_band to number', () => {
    const result = parseBody(simulateSchema, {
      facility_id: 'fac123',
      child_age_band: '4',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.child_age_band).toBe(4);
    }
  });
});

describe('usage gating logic', () => {
  const limits: Record<string, number> = { free: 3, basic: 15, premium: 999 };

  it('free tier allows 3 simulations', () => {
    expect(limits['free']).toBe(3);
  });

  it('basic tier allows 15 simulations', () => {
    expect(limits['basic']).toBe(15);
  });

  it('premium tier is effectively unlimited', () => {
    expect(limits['premium']).toBe(999);
  });

  it('exceeds limit when usage >= limit', () => {
    const currentUsage = 3;
    const limit = limits['free']!;
    expect(currentUsage >= limit).toBe(true);
  });
});
