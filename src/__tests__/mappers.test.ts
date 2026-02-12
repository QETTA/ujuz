import { describe, it, expect, vi } from 'vitest';

// Mock env and db before importing mappers (which imports admissionEngineV2 types)
vi.mock('../lib/server/env', () => ({
  env: {
    MONGODB_URI: 'mongodb://test',
    MONGODB_DB_NAME: 'test',
    AUTH_SECRET: 'test-secret',
    MONGODB_PLACES_COLLECTION: 'places',
    MONGODB_INSIGHTS_COLLECTION: 'refinedInsights',
    MONGODB_ADMISSION_BLOCKS_COLLECTION: 'admission_blocks',
    COST_DAILY_BUDGET_USD: 10,
    COST_MONTHLY_BUDGET_USD: 100,
    MEMORY_ENABLED: false,
  },
}));

vi.mock('../lib/server/db', () => ({
  getDbOrThrow: vi.fn(),
}));

import { mapEngineToFrontend } from '../lib/server/mappers';
import type { AdmissionScoreResultV2 as EngineResult } from '../lib/server/admissionEngineV2';

function makeEngineResult(overrides: Partial<EngineResult> = {}): EngineResult {
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
        data: { count: 2 },
      },
    ],
    version: '2.0',
    asOf: '2025-01-15T09:00:00Z',
    facility_id: 'fac-123',
    facility_name: '행복 어린이집',
    region_key: 'gangnam',
    ...overrides,
  };
}

describe('mapEngineToFrontend', () => {
  it('maps basic fields correctly', () => {
    const engine = makeEngineResult();
    const result = mapEngineToFrontend(engine, 2);

    expect(result.facilityId).toBe('fac-123');
    expect(result.facilityName).toBe('행복 어린이집');
    expect(result.ageBand).toBe(2);
    expect(result.regionKey).toBe('gangnam');
    expect(result.probability).toBe(0.72);
    expect(result.score).toBe(78);
    expect(result.grade).toBe('B');
    expect(result.confidence).toBe(0.85);
  });

  it('maps waitMonths to flat fields', () => {
    const engine = makeEngineResult({ waitMonths: { median: 5, p80: 10 } });
    const result = mapEngineToFrontend(engine);

    expect(result.waitMonthsMedian).toBe(5);
    expect(result.waitMonthsP80).toBe(10);
  });

  it('maps effectiveWaiting to both waiting and effectiveWaiting', () => {
    const engine = makeEngineResult({ effectiveWaiting: 15 });
    const result = mapEngineToFrontend(engine);

    expect(result.waiting).toBe(15);
    expect(result.effectiveWaiting).toBe(15);
  });

  it('maps evidence cards with updatedAt from asOf', () => {
    const engine = makeEngineResult();
    const result = mapEngineToFrontend(engine);

    expect(result.evidenceCards).toHaveLength(1);
    expect(result.evidenceCards[0].type).toBe('TO_SNAPSHOT');
    expect(result.evidenceCards[0].summary).toBe('최근 TO 2건 발생');
    expect(result.evidenceCards[0].strength).toBe(0.8);
    expect(result.evidenceCards[0].updatedAt).toBe('2025-01-15T09:00:00Z');
  });

  it('uses asOf as updatedAt', () => {
    const engine = makeEngineResult({ asOf: '2025-06-01T12:00:00Z' });
    const result = mapEngineToFrontend(engine);

    expect(result.updatedAt).toBe('2025-06-01T12:00:00Z');
  });

  it('defaults ageBand to 0 when not provided', () => {
    const engine = makeEngineResult();
    const result = mapEngineToFrontend(engine);

    expect(result.ageBand).toBe(0);
  });

  it('handles empty evidence cards array', () => {
    const engine = makeEngineResult({ evidenceCards: [] });
    const result = mapEngineToFrontend(engine);

    expect(result.evidenceCards).toEqual([]);
  });
});
