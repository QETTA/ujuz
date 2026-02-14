// @ts-nocheck
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { createServer } from '../app';
import { connectMongo, closeMongo } from '../lib/db';

let mongod: MongoMemoryServer;

beforeEach(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'ujuz_api_test_anon' } });
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = 'ujuz_api_test_anon';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ISSUER = 'ujuz-api';
  process.env.JWT_AUDIENCE = 'ujuz-widget';
  process.env.DEVICE_HASH_SALT = 'salt';
});

afterEach(async () => {
  await closeMongo();
  await mongod.stop();
});

describe('POST /api/v1/anon/session', () => {
  test('same device_fingerprint returns same anon_id and handle', async () => {
    const app = await createServer();
    const response1 = await app.inject({
      method: 'POST',
      url: '/api/v1/anon/session',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ device_fingerprint: 'same-device-1' }),
    });
    expect(response1.statusCode).toBe(200);

    const body1 = response1.json();
    expect(body1.anon_id).toBeTypeOf('string');
    expect(body1.handle).toMatch(/^익명\d{4}$/);

    await connectMongo();
    const app2 = await createServer();
    const response2 = await app2.inject({
      method: 'POST',
      url: '/api/v1/anon/session',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ device_fingerprint: 'same-device-1' }),
    });
    expect(response2.statusCode).toBe(200);

    const body2 = response2.json();
    expect(body2.anon_id).toBe(body1.anon_id);
    expect(body2.handle).toBe(body1.handle);

    await app.close();
    await app2.close();
  });
});
