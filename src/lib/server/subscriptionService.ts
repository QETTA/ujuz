/**
 * UJUz - Subscription Service
 * 구독 및 요금제 관리
 * 가격: Basic 5,900원, Premium 9,900원 (ujuz-api 기준)
 */

import { getDbOrThrow } from './db';
import { AppError } from './errors';
import { U } from './collections';
import type { UserSubscriptionDoc, UsageCounterDoc } from './dbTypes';


export interface ServerPlan {
  id: 'free' | 'basic' | 'premium';
  tier: 'free' | 'basic' | 'premium';
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: {
    admission_score_limit: number;
    to_alert_facility_limit: number;
    bot_query_daily_limit: number;
    priority_support: boolean;
    ad_free: boolean;
    export_data: boolean;
  };
}

export type PlanTier = ServerPlan['tier'];
export type BillingCycle = 'monthly' | 'yearly';

const PLANS: ServerPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: '무료',
    description: '기본 기능 체험',
    price_monthly: 0,
    price_yearly: 0,
    features: {
      admission_score_limit: 1,
      to_alert_facility_limit: 1,
      bot_query_daily_limit: 5,
      priority_support: false,
      ad_free: false,
      export_data: false,
    },
  },
  {
    id: 'basic',
    tier: 'basic',
    name: '베이직',
    description: '핵심 기능 활용',
    price_monthly: 5900,
    price_yearly: 59000,
    features: {
      admission_score_limit: 5,
      to_alert_facility_limit: 5,
      bot_query_daily_limit: 30,
      priority_support: false,
      ad_free: true,
      export_data: false,
    },
  },
  {
    id: 'premium',
    tier: 'premium',
    name: '프리미엄',
    description: '모든 기능 무제한',
    price_monthly: 9900,
    price_yearly: 99000,
    features: {
      admission_score_limit: -1,
      to_alert_facility_limit: -1,
      bot_query_daily_limit: -1,
      priority_support: true,
      ad_free: true,
      export_data: true,
    },
  },
];

/** Feature limit → display label */
function limitLabel(limit: number, unit: string): string {
  return limit === -1 ? '무제한' : `${limit}${unit}`;
}

/** Server PLANS → frontend SubscriptionPlan shape */
export function getDisplayPlans() {
  return {
    plans: PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.price_monthly,
      priceYearly: p.price_yearly,
      tagline: p.description,
      highlight: p.id === 'basic',
      features: [
        { label: `입학 점수 ${limitLabel(p.features.admission_score_limit, '회/월')}`, included: true },
        { label: `TO 알림 ${limitLabel(p.features.to_alert_facility_limit, '시설')}`, included: true },
        { label: `AI 상담 ${limitLabel(p.features.bot_query_daily_limit, '회/일')}`, included: true },
        { label: '광고 없음', included: p.features.ad_free },
        { label: '데이터 내보내기', included: p.features.export_data },
      ],
    })),
  };
}

export function getPlans() {
  return { plans: PLANS };
}

export async function getUserSubscription(userId: string) {
  const db = await getDbOrThrow();
  const doc = await db.collection<UserSubscriptionDoc>(U.USER_SUBSCRIPTIONS).findOne({
    user_id: userId,
    status: { $in: ['active', 'trial'] },
  });

  if (!doc) return null;

  return {
    id: doc._id.toString(),
    plan: PLANS.find((p) => p.tier === doc.plan_tier) ?? PLANS[0],
    billing_cycle: doc.billing_cycle,
    status: doc.status,
    current_period_start: doc.current_period_start.toISOString(),
    current_period_end: doc.current_period_end.toISOString(),
    usage: {
      admission_scores_used: doc.admission_scores_used ?? 0,
      to_alerts_active: doc.to_alerts_active ?? 0,
      bot_queries_today: doc.bot_queries_today ?? 0,
      last_reset: doc.last_reset?.toISOString() ?? new Date().toISOString(),
    },
    created_at: doc.created_at.toISOString(),
  };
}

export async function createSubscription(userId: string, planTier: PlanTier, billingCycle: BillingCycle) {
  const db = await getDbOrThrow();
  const plan = PLANS.find((p) => p.tier === planTier);
  if (!plan) throw new AppError('Invalid plan', 400, 'invalid_plan');

  const now = new Date();
  const periodEnd = new Date(now.getTime());
  if (billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setDate(1);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const col = db.collection<UserSubscriptionDoc>(U.USER_SUBSCRIPTIONS);

  // Atomic cancel → ensures only the first concurrent request sees an active sub
  await col.findOneAndUpdate(
    { user_id: userId, status: 'active' },
    { $set: { status: 'cancelled' } },
  );

  const doc = {
    user_id: userId,
    plan_tier: planTier,
    billing_cycle: billingCycle,
    status: 'active',
    current_period_start: now,
    current_period_end: periodEnd,
    admission_scores_used: 0,
    to_alerts_active: 0,
    bot_queries_today: 0,
    last_reset: now,
    created_at: now,
  } satisfies Omit<UserSubscriptionDoc, '_id'>;

  let result;
  try {
    result = await col.insertOne(doc as UserSubscriptionDoc);
  } catch (err: unknown) {
    // Unique partial index safety net: if another request won the race, conflict
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      throw new AppError('구독 생성 충돌이 발생했습니다. 다시 시도해 주세요.', 409, 'subscription_conflict');
    }
    throw err;
  }

  return {
    id: result.insertedId.toString(),
    plan,
    billing_cycle: billingCycle,
    status: 'active',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    usage: { admission_scores_used: 0, to_alerts_active: 0, bot_queries_today: 0, last_reset: now.toISOString() },
    created_at: now.toISOString(),
  };
}

export async function cancelSubscription(userId: string) {
  const db = await getDbOrThrow();
  const result = await db.collection<UserSubscriptionDoc>(U.USER_SUBSCRIPTIONS).updateOne(
    { user_id: userId, status: 'active' },
    { $set: { status: 'cancelled' } },
  );

  if (result.matchedCount === 0) {
    throw new AppError('No active subscription', 404, 'no_subscription');
  }
}

export async function incrementUsage(userId: string, field: 'admission_scores_used' | 'bot_queries_today' | 'to_alerts_active') {
  const db = await getDbOrThrow();
  await db.collection<UserSubscriptionDoc>(U.USER_SUBSCRIPTIONS).updateOne(
    { user_id: userId, status: { $in: ['active', 'trial'] } },
    { $inc: { [field]: 1 } },
  );
}

// ─── Tier-based Usage Gating ─────────────────────────────

type GatedFeature = 'admission_calc' | 'explain' | 'to_alerts_slots' | 'community_write';

interface TierLimits {
  admission_calc: number;   // per month (-1 = unlimited)
  explain: number;          // per day (-1 = unlimited)
  to_alerts_slots: number;  // total active (-1 = unlimited)
  community_write: number;  // per day (-1 = unlimited)
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free:    { admission_calc: 1,  explain: 3,  to_alerts_slots: 1,  community_write: 0 },
  basic:   { admission_calc: 10, explain: 30, to_alerts_slots: 5,  community_write: 5 },
  premium: { admission_calc: -1, explain: -1, to_alerts_slots: -1, community_write: -1 },
};

function getPeriodKey(feature: GatedFeature): string {
  const now = new Date();
  if (feature === 'admission_calc') {
    // Monthly period
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  // Daily period
  return now.toISOString().slice(0, 10);
}

function getResetAt(feature: GatedFeature): string {
  const now = new Date();
  if (feature === 'admission_calc') {
    // Reset at start of next month
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next.toISOString();
  }
  // Reset at start of next day
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.toISOString();
}

export interface CheckLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  upgradeNeeded: boolean;
}

export async function checkLimit(subjectId: string, feature: GatedFeature): Promise<CheckLimitResult> {
  const db = await getDbOrThrow();

  // Determine user tier
  const sub = await db.collection<UserSubscriptionDoc>(U.USER_SUBSCRIPTIONS).findOne({
    user_id: subjectId,
    status: { $in: ['active', 'trial'] },
  });
  const tier = sub?.plan_tier ?? 'free';
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const limit = limits[feature];

  // Unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, resetAt: '', upgradeNeeded: false };
  }

  // Zero limit (feature disabled for tier)
  if (limit === 0) {
    return { allowed: false, remaining: 0, resetAt: '', upgradeNeeded: true };
  }

  // For to_alerts_slots, count active slots instead of usage_counters
  if (feature === 'to_alerts_slots') {
    const activeCount = await db.collection(U.TO_SUBSCRIPTIONS).countDocuments({
      user_id: subjectId,
      is_active: true,
    });
    const remaining = Math.max(0, limit - activeCount);
    return {
      allowed: activeCount < limit,
      remaining,
      resetAt: '',
      upgradeNeeded: remaining === 0,
    };
  }

  const period = getPeriodKey(feature);
  const counter = await db.collection<UsageCounterDoc>(U.USAGE_COUNTERS).findOne({
    subject_id: subjectId,
    period,
    feature,
  });

  const used = counter?.count ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    remaining,
    resetAt: getResetAt(feature),
    upgradeNeeded: remaining === 0,
  };
}

export async function incrementFeatureUsage(subjectId: string, feature: GatedFeature): Promise<void> {
  if (feature === 'to_alerts_slots') return; // Slots counted by active subscriptions

  const db = await getDbOrThrow();
  const period = getPeriodKey(feature);

  await db.collection<UsageCounterDoc>(U.USAGE_COUNTERS).updateOne(
    { subject_id: subjectId, period, feature },
    {
      $inc: { count: 1 },
      $set: { updated_at: new Date() },
      $setOnInsert: { subject_id: subjectId, period, feature },
    },
    { upsert: true },
  );
}
