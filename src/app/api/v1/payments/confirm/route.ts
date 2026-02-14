import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getDbOrThrow } from '@/lib/server/db';
import { confirmPayment } from '@/lib/server/paymentService';
import { createSubscription } from '@/lib/server/subscriptionService';
import { logger } from '@/lib/server/logger';
import { U } from '@/lib/server/collections';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const body = await req.json().catch(() => null);
    if (!isConfirmBody(body)) {
      logRequest(req, 400, start, traceId);
      logger.warn('payment_confirm_fail', { traceId, reason: 'missing_fields' });
      return errors.badRequest('paymentKey, orderId, amount required', 'missing_fields');
    }

    const paymentKey = body.paymentKey.trim();
    const orderId = body.orderId.trim();
    const amount = Number(body.amount);
    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
      logRequest(req, 400, start, traceId);
      logger.warn('payment_confirm_fail', { traceId, orderId, reason: 'invalid_fields' });
      return errors.badRequest('paymentKey, orderId, amount 형식이 올바르지 않습니다.', 'invalid_fields');
    }

    const db = await getDbOrThrow();
    const paymentRecord = await db.collection(U.PAYMENTS).findOne<{
      user_id?: string;
      plan_tier?: string;
      billing_cycle?: string;
      order_type?: string;
      toss_response?: Record<string, unknown>;
    }>({ order_id: orderId });

    if (!paymentRecord) {
      logRequest(req, 404, start, traceId);
      logger.warn('payment_confirm_fail', { traceId, orderId, reason: 'payment_not_found' });
      return errors.notFound('Payment record not found', 'payment_not_found');
    }

    const result = await confirmPayment(db, paymentKey, orderId, amount);
    if (!result.success) {
      logRequest(req, 400, start, traceId);
      logger.warn('payment_confirm_fail', {
        traceId,
        orderId,
        reason: result.error ?? 'payment_failed',
      });
      return errors.badRequest('결제가 완료되지 않았어요.', 'PAYMENT_FAILED', {
        reason: result.error ?? 'payment_failed',
      });
    }

    const now = new Date();
    let subscription: unknown = null;

    if (paymentRecord.order_type === 'consultation') {
      await db.collection(U.ORDERS).updateOne(
        { order_id: orderId },
        {
          $set: {
            status: 'PAID',
            paid_at: now,
            updated_at: now,
          },
          $setOnInsert: {
            order_id: orderId,
            created_at: now,
          },
        },
        { upsert: true },
      );
    } else if (
      paymentRecord.user_id
      && (paymentRecord.plan_tier === 'basic' || paymentRecord.plan_tier === 'premium')
      && (paymentRecord.billing_cycle === 'monthly' || paymentRecord.billing_cycle === 'yearly')
    ) {
      subscription = await createSubscription(
        paymentRecord.user_id,
        paymentRecord.plan_tier,
        paymentRecord.billing_cycle,
      );
    }

    const confirmedPayment = await db.collection(U.PAYMENTS).findOne<{ toss_response?: Record<string, unknown> }>({
      order_id: orderId,
    });
    const receiptUrl = extractReceiptUrl(confirmedPayment?.toss_response);

    logger.info('payment_confirm_success', {
      traceId,
      orderId,
      payment_type: paymentRecord.order_type ?? 'subscription',
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      status: 'PAID',
      ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
      ...(subscription ? { subscription } : {}),
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logger.warn('payment_confirm_fail', {
      traceId,
      reason: error instanceof Error ? error.message : String(error),
    });
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

function isConfirmBody(body: unknown): body is {
  paymentKey: string;
  orderId: string;
  amount: number;
} {
  return !!body
    && typeof body === 'object'
    && typeof (body as Record<string, unknown>).paymentKey === 'string'
    && typeof (body as Record<string, unknown>).orderId === 'string'
    && typeof (body as Record<string, unknown>).amount === 'number';
}

function extractReceiptUrl(tossResponse: Record<string, unknown> | undefined): string | undefined {
  if (!tossResponse) return undefined;
  const receipt = tossResponse.receipt;
  if (!receipt || typeof receipt !== 'object') return undefined;
  const url = (receipt as Record<string, unknown>).url;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}
