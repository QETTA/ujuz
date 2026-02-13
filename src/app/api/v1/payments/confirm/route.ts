import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getDbOrThrow } from '@/lib/server/db';
import { confirmPayment } from '@/lib/server/paymentService';
import { createSubscription } from '@/lib/server/subscriptionService';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const body = await req.json().catch(() => null);
    if (!body?.paymentKey || !body?.orderId || !body?.amount) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('paymentKey, orderId, amount required', 'missing_fields');
    }
    const { paymentKey, orderId, amount } = body as { paymentKey: string; orderId: string; amount: number };
    const db = await getDbOrThrow();
    
    // Find the payment record to get plan details
    const paymentRecord = await db.collection('payments').findOne({ order_id: orderId, user_id: userId });
    if (!paymentRecord) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('Payment record not found', 'payment_not_found');
    }
    
    // Confirm with Toss
    const result = await confirmPayment(db, paymentKey, orderId, amount);
    if (!result.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(result.error ?? 'Payment confirmation failed', 'payment_failed');
    }
    
    // Activate subscription
    const plan_tier = paymentRecord.plan_tier as 'basic' | 'premium';
    const billing_cycle = paymentRecord.billing_cycle as 'monthly' | 'yearly';
    const subscription = await createSubscription(userId, plan_tier, billing_cycle);
    
    logger.info('Payment confirmed and subscription activated', {
      userId, orderId, plan_tier, billing_cycle,
    });
    
    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true, subscription });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
