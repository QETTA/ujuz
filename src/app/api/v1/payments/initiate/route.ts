import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getDbOrThrow } from '@/lib/server/db';
import { generateOrderId, createPaymentRecord } from '@/lib/server/paymentService';

export const runtime = 'nodejs';

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 5900, yearly: 59000 },
  premium: { monthly: 9900, yearly: 99000 },
};

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const body = await req.json().catch(() => null);
    if (!body || !body.plan_tier || !body.billing_cycle) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('plan_tier and billing_cycle required', 'missing_fields');
    }
    const { plan_tier, billing_cycle } = body as { plan_tier: string; billing_cycle: string };
    const prices = PLAN_PRICES[plan_tier];
    if (!prices || !['monthly', 'yearly'].includes(billing_cycle)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid plan or billing cycle', 'invalid_plan');
    }
    const amount = billing_cycle === 'yearly' ? prices.yearly : prices.monthly;
    const orderId = generateOrderId(userId, plan_tier);
    const db = await getDbOrThrow();
    await createPaymentRecord(db, userId, orderId, amount, plan_tier, billing_cycle);
    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      order_id: orderId,
      amount,
      order_name: `UjuZ ${plan_tier === 'basic' ? '베이직' : '프리미엄'} (${billing_cycle === 'yearly' ? '연간' : '월간'})`,
      customer_key: userId,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
