// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { createServer } from '../app';
import { closeMongo } from '../lib/db';

let mongod: MongoMemoryServer;

beforeEach(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'ujuz_api_test_admission' } });
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = 'ujuz_api_test_admission';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ISSUER = 'ujuz-api';
  process.env.JWT_AUDIENCE = 'ujuz-widget';
  process.env.DEVICE_HASH_SALT = 'salt';
  process.env.TIER_DEFAULT = 'free';
  process.env.COMMUNITY_WRITE_ENABLED = 'true';
});

afterEach(async () => {
  await closeMongo();
  await mongod.stop();
});

async function createAuthenticatedSession(app: Awaited<ReturnType<typeof createServer>>, device = 'device-auth') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/anon/session',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ device_fingerprint: device }),
  });
  return response.json().anon_token as string;
}

describe('admission calc and explain', () => {
  test('calc returns valid shape and respects free tier monthly limit', async () => {
    const app = await createServer();
    const token = await createAuthenticatedSession(app, 'device-adm');

    const payload = {
      region: {
        type: 'SIGUNGU',
        code: '11110',
        label: '서울시 종로구',
      },
      age_class: 'AGE_2',
      desired_start_month: '2026-03',
      applied_month: null,
      wait_rank: 12,
      bonuses: ['dual_income', 'sibling'],
      facility_scope: {
        mode: 'REGION_ONLY',
        facility_ids: [],
      },
    };

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/admission/calc',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: JSON.stringify(payload),
    });

    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.result.grade).toMatch(/^[A-F]$/);
    expect(firstBody.result.probability.p_3m).toBeLessThanOrEqual(firstBody.result.probability.p_6m);
    expect(firstBody.result.probability.p_6m).toBeLessThanOrEqual(firstBody.result.probability.p_12m);
    expect(firstBody.result.eta_months.p50).toBeLessThanOrEqual(firstBody.result.eta_months.p90);
    expect(firstBody.next_ctas.length).toBeGreaterThanOrEqual(2);

    const explain = await app.inject({
      method: 'POST',
      url: '/api/v1/admission/explain',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ request_id: firstBody.request_id, focus: 'next_steps' }),
    });

    expect(explain.statusCode).toBe(200);
    const explainBody = explain.json();
    expect(Array.isArray(explainBody.next_actions)).toBe(true);
    expect(explainBody.caveats.length).toBeGreaterThan(0);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/admission/calc',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: JSON.stringify(payload),
    });
    expect(second.statusCode).toBe(429);
    const err = second.json();
    expect(err.error).toBe('LIMIT_EXCEEDED');

    await app.close();
  });
});
