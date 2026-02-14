import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { COLLECTIONS } from '../lib/collections';
import { checkAndIncrement } from '../lib/limits';
import { connectMongo, closeMongo } from '../lib/db';
import { Tier } from '../lib/types';

let mongod: MongoMemoryServer;

beforeEach(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'ujuz_api_test_limits' } });
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = 'ujuz_api_test_limits';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ISSUER = 'ujuz-api';
  process.env.JWT_AUDIENCE = 'ujuz-widget';
});

afterEach(async () => {
  await closeMongo();
  await mongod.stop();
});

describe('usage counter atomic increment', () => {
  test('prevents limit overflow under concurrent admission calc checks', async () => {
    const db = await connectMongo();
    await db.collection(COLLECTIONS.usageCounters).createIndex(
      { subject_id: 1, period: 1, feature: 1 },
      { unique: true },
    );
    const subjectId = 'anon-1';
    const tier: Tier = 'free';

    const attempts = Array.from({ length: 20 }).map(() =>
      checkAndIncrement(db, { subjectId, feature: 'admission_calc', tier }).then(
        () => ({ ok: true }),
        () => ({ ok: false }),
      ),
    );
    const result = await Promise.all(attempts);
    const successCount = result.filter((r) => r.ok).length;
    expect(successCount).toBe(1);

    const row = await db.collection(COLLECTIONS.usageCounters).findOne({
      subject_id: subjectId,
      feature: 'admission_calc',
    });
    expect(row?.count).toBe(1);
  });
});
