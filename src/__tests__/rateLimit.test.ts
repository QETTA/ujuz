import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env, db, logger, and collections before importing
vi.mock('../lib/server/env', () => ({
  env: {
    MONGODB_URI: 'mongodb://test',
    MONGODB_DB_NAME: 'test',
    AUTH_SECRET: 'test-secret',
  },
}));

vi.mock('../lib/server/db', () => ({
  getDbOrThrow: vi.fn(() => { throw new Error('DB unavailable'); }),
}));

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/server/collections', () => ({
  U: { RATE_LIMITS: 'rate_limits' },
}));

import { checkRateLimit } from '../lib/server/rateLimit';

// ─── In-memory fallback (DB is mocked to throw) ─────────────

describe('checkRateLimit (in-memory fallback)', () => {
  beforeEach(() => {
    // Clear the module's internal memoryStore between tests by re-importing
    vi.resetModules();
  });

  it('allows first request', async () => {
    const { checkRateLimit: check } = await import('../lib/server/rateLimit');
    const result = await check('test-key-1', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining on successive requests', async () => {
    const { checkRateLimit: check } = await import('../lib/server/rateLimit');
    await check('test-key-2', 3, 60_000);
    const second = await check('test-key-2', 3, 60_000);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it('blocks after exceeding max requests', async () => {
    const { checkRateLimit: check } = await import('../lib/server/rateLimit');
    for (let i = 0; i < 3; i++) {
      await check('test-key-3', 3, 60_000);
    }
    const result = await check('test-key-3', 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('isolates different keys', async () => {
    const { checkRateLimit: check } = await import('../lib/server/rateLimit');
    await check('key-a', 1, 60_000);
    const resultA = await check('key-a', 1, 60_000);
    const resultB = await check('key-b', 1, 60_000);
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });
});
