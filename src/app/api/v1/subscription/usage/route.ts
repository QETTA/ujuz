import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { checkLimit } from '@/lib/server/subscriptionService';
import type { UserSubscriptionDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

/**
 * GET /api/v1/subscription/usage
 * Returns current usage stats for all gated features.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    // Get subscription info
    const sub = await db.collection<UserSubscriptionDoc>('user_subscriptions').findOne({
      user_id: userId,
      status: { $in: ['active', 'trial'] },
    });

    // Check all feature limits in parallel
    const [admissionLimit, explainLimit, toSlotsLimit, communityLimit] = await Promise.all([
      checkLimit(userId, 'admission_calc'),
      checkLimit(userId, 'explain'),
      checkLimit(userId, 'to_alerts_slots'),
      checkLimit(userId, 'community_write'),
    ]);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      plan_tier: sub?.plan_tier ?? 'free',
      billing_cycle: sub?.billing_cycle ?? null,
      status: sub?.status ?? 'free',
      period_end: sub?.current_period_end?.toISOString() ?? null,
      cancel_at_period_end: (sub as Record<string, unknown>)?.cancel_at_period_end ?? false,
      usage: {
        admission_calc: {
          remaining: admissionLimit.remaining,
          allowed: admissionLimit.allowed,
          resetAt: admissionLimit.resetAt,
          upgradeNeeded: admissionLimit.upgradeNeeded,
        },
        explain: {
          remaining: explainLimit.remaining,
          allowed: explainLimit.allowed,
          resetAt: explainLimit.resetAt,
          upgradeNeeded: explainLimit.upgradeNeeded,
        },
        to_alerts_slots: {
          remaining: toSlotsLimit.remaining,
          allowed: toSlotsLimit.allowed,
          upgradeNeeded: toSlotsLimit.upgradeNeeded,
        },
        community_write: {
          remaining: communityLimit.remaining,
          allowed: communityLimit.allowed,
          resetAt: communityLimit.resetAt,
          upgradeNeeded: communityLimit.upgradeNeeded,
        },
      },
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
