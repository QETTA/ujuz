import type { Db } from 'mongodb';

import { AppError } from './errors';
import type { Tier, UsageFeature } from './types';
import { COLLECTIONS } from './collections';
import { getPeriodForFeature } from './time';

type TierPolicy = {
  admission_calc: number;
  admission_explain: number;
  community_write: number;
  to_alert_slots: number;
};

type LimitCheckResult = {
  allowed: boolean;
  feature: string;
  remaining: number;
  reset_at: string;
};

const TIER_LIMITS: Record<Tier, TierPolicy> = {
  free: {
    admission_calc: 1,
    admission_explain: 3,
    community_write: 0,
    to_alert_slots: 1,
  },
  basic: {
    admission_calc: 10,
    admission_explain: 30,
    community_write: 5,
    to_alert_slots: 5,
  },
  premium: {
    admission_calc: 99999,
    admission_explain: 99999,
    community_write: 99999,
    to_alert_slots: 99999,
  },
};

export function getLimit(tier: Tier, feature: keyof TierPolicy): number {
  return TIER_LIMITS[tier][feature];
}

function resolveLimitPeriod(feature: UsageFeature, now = new Date()) {
  return getPeriodForFeature(feature, now);
}

export async function checkAndIncrement(
  db: Db,
  params: {
    subjectId: string;
    feature: UsageFeature;
    tier: Tier;
    now?: Date;
  },
): Promise<LimitCheckResult> {
  const limit = getLimit(params.tier, params.feature);
  const periodInfo = resolveLimitPeriod(params.feature, params.now);
  if (limit >= 99999) {
    return {
      allowed: true,
      feature: params.feature,
      remaining: 99999,
      reset_at: periodInfo.resetAt,
    };
  }

  const col = db.collection(COLLECTIONS.usageCounters);
  const now = params.now ?? new Date();
  const result = await col.findOneAndUpdate(
    { subject_id: params.subjectId, period: periodInfo.period, feature: params.feature, count: { $lt: limit } },
    {
      $inc: { count: 1 },
      $set: { updated_at: now },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  );

  const doc = result as Record<string, unknown> | null;
  const docCount = (doc as { count?: number })?.count ?? 0;

  if (!doc) {
    throw new AppError(
      'LIMIT_EXCEEDED',
      'Usage limit exceeded',
      429,
      {
        feature: params.feature,
        allowed: false,
        remaining: 0,
        reset_at: periodInfo.resetAt,
        upgrade_needed: true,
      },
    );
  }

  return {
    allowed: true,
    feature: params.feature,
    remaining: Math.max(limit - docCount, 0),
    reset_at: periodInfo.resetAt,
  };
}

export async function decrementUsage(db: Db, subjectId: string, feature: UsageFeature, now = new Date()) {
  const periodInfo = resolveLimitPeriod(feature, now);
  await db.collection(COLLECTIONS.usageCounters).updateOne(
    {
      subject_id: subjectId,
      period: periodInfo.period,
      feature,
      count: { $gt: 0 },
    },
    { $inc: { count: -1 }, $set: { updated_at: now } },
  );
}

export type { LimitCheckResult };
