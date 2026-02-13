import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mocks ───────────────────────────────────────────────

const mockCollection = {
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(() => Promise.resolve(null)),
  find: vi.fn(),
  insertOne: vi.fn(() => Promise.resolve({ insertedId: new ObjectId() })),
  updateOne: vi.fn(() => Promise.resolve({ matchedCount: 1, modifiedCount: 1 })),
  updateMany: vi.fn(() => Promise.resolve({ matchedCount: 0, modifiedCount: 0 })),
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
    USER_SUBSCRIPTIONS: 'user_subscriptions',
    TO_SUBSCRIPTIONS: 'to_subscriptions',
    USAGE_COUNTERS: 'usage_counters',
  },
}));

import {
  getPlans,
  getDisplayPlans,
  getUserSubscription,
  createSubscription,
  cancelSubscription,
  checkLimit,
  incrementFeatureUsage,
} from '../lib/server/subscriptionService';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Plan display ────────────────────────────────────────

describe('getPlans', () => {
  it('returns 3 tiers', () => {
    const { plans } = getPlans();
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.tier)).toEqual(['free', 'basic', 'premium']);
  });
});

describe('getDisplayPlans', () => {
  it('highlights basic plan', () => {
    const { plans } = getDisplayPlans();
    const basic = plans.find((p) => p.id === 'basic');
    expect(basic?.highlight).toBe(true);
  });

  it('shows "무제한" for premium features', () => {
    const { plans } = getDisplayPlans();
    const premium = plans.find((p) => p.id === 'premium');
    const admissionFeature = premium?.features.find((f) => f.label.includes('입학'));
    expect(admissionFeature?.label).toContain('무제한');
  });
});

// ── getUserSubscription ─────────────────────────────────

describe('getUserSubscription', () => {
  it('returns null when no active subscription', async () => {
    mockCollection.findOne.mockResolvedValueOnce(null);
    const result = await getUserSubscription('user1');
    expect(result).toBeNull();
  });

  it('returns subscription with usage info', async () => {
    const now = new Date();
    mockCollection.findOne.mockResolvedValueOnce({
      _id: new ObjectId(),
      user_id: 'user1',
      plan_tier: 'basic',
      billing_cycle: 'monthly',
      status: 'active',
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 30 * 86400000),
      admission_scores_used: 3,
      to_alerts_active: 2,
      bot_queries_today: 5,
      last_reset: now,
      created_at: now,
    });

    const result = await getUserSubscription('user1');
    expect(result).not.toBeNull();
    expect(result!.plan.tier).toBe('basic');
    expect(result!.usage.admission_scores_used).toBe(3);
  });
});

// ── createSubscription ──────────────────────────────────

describe('createSubscription', () => {
  it('creates active subscription and atomically cancels old one', async () => {
    const result = await createSubscription('user1', 'basic', 'monthly');
    expect(result.status).toBe('active');
    expect(result.plan.tier).toBe('basic');
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { user_id: 'user1', status: 'active' },
      { $set: { status: 'cancelled' } },
    );
    expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
  });
});

// ── cancelSubscription ──────────────────────────────────

describe('cancelSubscription', () => {
  it('throws when no active subscription', async () => {
    mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    await expect(cancelSubscription('user1')).rejects.toThrow('No active subscription');
  });
});

// ── checkLimit ──────────────────────────────────────────

describe('checkLimit', () => {
  it('allows unlimited for premium users', async () => {
    mockCollection.findOne.mockResolvedValueOnce({
      _id: new ObjectId(),
      plan_tier: 'premium',
      status: 'active',
    });

    const result = await checkLimit('user1', 'admission_calc');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });

  it('blocks free user community_write (limit=0)', async () => {
    mockCollection.findOne.mockResolvedValueOnce(null); // no subscription → free tier

    const result = await checkLimit('user1', 'community_write');
    expect(result.allowed).toBe(false);
    expect(result.upgradeNeeded).toBe(true);
  });

  it('counts active slots for to_alerts_slots', async () => {
    mockCollection.findOne.mockResolvedValueOnce(null); // free tier → 1 slot limit
    mockCollection.countDocuments.mockResolvedValueOnce(1);

    const result = await checkLimit('user1', 'to_alerts_slots');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

// ── incrementFeatureUsage ───────────────────────────────

describe('incrementFeatureUsage', () => {
  it('upserts usage counter', async () => {
    await incrementFeatureUsage('user1', 'admission_calc');
    expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
  });

  it('skips for to_alerts_slots (counted by active subs)', async () => {
    await incrementFeatureUsage('user1', 'to_alerts_slots');
    expect(mockCollection.updateOne).not.toHaveBeenCalled();
  });
});
