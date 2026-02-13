import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getDbOrThrow } from '@/lib/server/db';
import { logger } from '@/lib/server/logger';
import type { UserSubscriptionDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

const GRACE_PERIOD_DAYS = 7; // 7-day grace period after cancellation

/**
 * POST /api/v1/subscription/cancel
 * Body: { reason?: string, immediate?: boolean }
 * 
 * Default: Sets cancel_at_period_end = true (continues until period end)
 * Immediate: Cancels right away + triggers refund request
 */
export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await req.json().catch(() => ({})) as { reason?: string; immediate?: boolean };

    const db = await getDbOrThrow();
    const col = db.collection<UserSubscriptionDoc>('user_subscriptions');

    const sub = await col.findOne({
      user_id: userId,
      status: { $in: ['active', 'trial'] },
    });

    if (!sub) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('활성 구독이 없습니다', 'no_subscription');
    }

    const now = new Date();

    if (body.immediate) {
      // Immediate cancellation
      await col.updateOne(
        { _id: sub._id },
        {
          $set: {
            status: 'cancelled',
            cancelled_at: now,
            cancel_reason: body.reason ?? '사용자 요청',
            cancel_at_period_end: false,
          },
        },
      );

      // Log refund request (actual refund handled via Toss webhook or admin)
      await db.collection('refund_requests').insertOne({
        user_id: userId,
        subscription_id: sub._id.toString(),
        plan_tier: sub.plan_tier,
        reason: body.reason ?? '사용자 요청 (즉시 해지)',
        status: 'pending',
        created_at: now,
      });

      logger.info('Subscription cancelled immediately', { userId, planTier: sub.plan_tier });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({
        ok: true,
        cancelled: true,
        effective_date: now.toISOString(),
        refund_requested: true,
      });
    }

    // End-of-period cancellation (default)
    const gracePeriodEnd = new Date(sub.current_period_end.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await col.updateOne(
      { _id: sub._id },
      {
        $set: {
          cancel_at_period_end: true,
          cancel_reason: body.reason ?? '사용자 요청',
          cancel_requested_at: now,
          grace_period_end: gracePeriodEnd,
        },
      },
    );

    logger.info('Subscription cancel scheduled', {
      userId,
      planTier: sub.plan_tier,
      effectiveDate: sub.current_period_end.toISOString(),
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      ok: true,
      cancelled: false,
      cancel_at_period_end: true,
      effective_date: sub.current_period_end.toISOString(),
      grace_period_end: gracePeriodEnd.toISOString(),
      message: `구독이 ${sub.current_period_end.toLocaleDateString('ko-KR')}에 종료됩니다. ${GRACE_PERIOD_DAYS}일 유예 기간이 제공됩니다.`,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
