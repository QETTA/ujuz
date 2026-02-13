import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mocks ───────────────────────────────────────────────

function makeFindChain() {
  const chain: Record<string, unknown> = {};
  chain.sort = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.toArray = vi.fn(() => Promise.resolve([]));
  return chain;
}

const mockCollection = {
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn<(...args: unknown[]) => Promise<Record<string, unknown> | null>>(
    () => Promise.resolve(null),
  ),
  find: vi.fn(() => makeFindChain()),
  insertOne: vi.fn(() => Promise.resolve({ insertedId: new ObjectId() })),
  updateOne: vi.fn(() => Promise.resolve({ matchedCount: 1, modifiedCount: 1 })),
  countDocuments: vi.fn(() => Promise.resolve(0)),
};

const mockDb = {
  collection: vi.fn(() => mockCollection),
};

vi.mock('../lib/server/env', () => ({
  env: { MONGODB_URI: 'mongodb://test', MONGODB_DB_NAME: 'test', AUTH_SECRET: 'test' },
}));

vi.mock('../lib/server/db', () => ({
  getDbOrThrow: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock('../lib/server/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/server/collections', () => ({
  U: {
    TO_SUBSCRIPTIONS: 'to_subscriptions',
    TO_ALERTS: 'to_alerts',
  },
}));

import { createSubscription, getUserSubscriptions, deleteSubscription, getAlertHistory } from '../lib/server/toAlertService';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createSubscription ──────────────────────────────────

describe('createSubscription', () => {
  it('creates a new subscription via atomic upsert', async () => {
    const upsertedDoc = {
      _id: new ObjectId(),
      user_id: 'user1',
      facility_id: 'fac1',
      facility_name: '해피어린이집',
      target_classes: ['age_2'],
      is_active: true,
      notification_preferences: { push: true, sms: false, email: false },
      created_at: new Date(),
    };
    mockCollection.findOneAndUpdate.mockResolvedValueOnce(upsertedDoc);

    const result = await createSubscription({
      user_id: 'user1',
      facility_id: 'fac1',
      facility_name: '해피어린이집',
      target_classes: ['age_2'],
      notification_preferences: { push: true, sms: false, email: false },
    });

    expect(result.facility_id).toBe('fac1');
    expect(result.is_active).toBe(true);
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('updates existing active subscription atomically', async () => {
    const updatedDoc = {
      _id: new ObjectId(),
      user_id: 'user1',
      facility_id: 'fac1',
      facility_name: '해피어린이집',
      target_classes: ['age_2', 'age_3'],
      is_active: true,
      notification_preferences: { push: true, sms: true, email: false },
      created_at: new Date(),
    };
    mockCollection.findOneAndUpdate.mockResolvedValueOnce(updatedDoc);

    const result = await createSubscription({
      user_id: 'user1',
      facility_id: 'fac1',
      facility_name: '해피어린이집',
      target_classes: ['age_2', 'age_3'],
      notification_preferences: { push: true, sms: true, email: false },
    });

    expect(result.target_classes).toEqual(['age_2', 'age_3']);
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });
});

// ── getUserSubscriptions ────────────────────────────────

describe('getUserSubscriptions', () => {
  it('returns empty array when no subscriptions', async () => {
    mockCollection.find.mockReturnValueOnce(makeFindChain());

    const result = await getUserSubscriptions('user1');
    expect(result.subscriptions).toEqual([]);
  });
});

// ── deleteSubscription ──────────────────────────────────

describe('deleteSubscription', () => {
  it('soft-deletes by setting is_active to false', async () => {
    await deleteSubscription('user1', 'fac1');

    expect(mockCollection.updateOne).toHaveBeenCalledWith(
      { user_id: 'user1', facility_id: 'fac1' },
      { $set: { is_active: false } },
    );
  });
});

// ── getAlertHistory ─────────────────────────────────────

describe('getAlertHistory', () => {
  it('returns empty when user has no active subscriptions', async () => {
    mockCollection.find.mockReturnValueOnce(makeFindChain());

    const result = await getAlertHistory('user1');
    expect(result.alerts).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.unread_count).toBe(0);
  });
});
