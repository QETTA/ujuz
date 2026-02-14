import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getDbOrThrow } from '@/lib/server/db';
import { generateOrderId, createPaymentRecord } from '@/lib/server/paymentService';
import { U } from '@/lib/server/collections';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 5900, yearly: 59000 },
  premium: { monthly: 9900, yearly: 99000 },
};

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('요청 본문이 필요합니다.', 'missing_body');
    }

    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    // T-303 상담 결제 정본 플로우
    if (hasConsultPaymentFields(body)) {
      const orderId = body.order_id.trim();
      const amountKrw = Number(body.amount_krw);
      const orderName = body.order_name.trim();

      if (!orderId || !Number.isFinite(amountKrw) || amountKrw <= 0 || !orderName) {
        logRequest(req, 400, start, traceId);
        return errors.badRequest('order_id, amount_krw, order_name 형식이 올바르지 않습니다.', 'invalid_fields');
      }

      const existing = await db.collection(U.PAYMENTS).findOne<{ status?: string }>({ order_id: orderId });
      if (existing?.status === 'confirmed') {
        logRequest(req, 409, start, traceId);
        return errors.conflict('이미 결제가 완료된 주문입니다.', 'already_paid');
      }

      const now = new Date();
      await db.collection(U.PAYMENTS).updateOne(
        { order_id: orderId },
        {
          $set: {
            user_id: userId,
            order_id: orderId,
            amount: amountKrw,
            order_name: orderName,
            status: 'pending',
            payment_key: '',
            order_type: 'consultation',
            updated_at: now,
          },
          $setOnInsert: {
            created_at: now,
          },
        },
        { upsert: true },
      );

      logger.info('payment_initiate', {
        traceId,
        userId,
        order_id: orderId,
        amount_krw: amountKrw,
      });

      const origin = new URL(req.url).origin;
      logRequest(req, 200, start, traceId);
      return NextResponse.json({
        pg_order_id: orderId,
        amount_krw: amountKrw,
        success_url: `${origin}/payment/success`,
        fail_url: `${origin}/payment/fail`,
      });
    }

    // 기존 구독 결제 플로우 (호환 유지)
    if (!hasSubscriptionFields(body)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('plan_tier and billing_cycle required', 'missing_fields');
    }

    const { plan_tier, billing_cycle } = body;
    const prices = PLAN_PRICES[plan_tier];
    if (!prices || !['monthly', 'yearly'].includes(billing_cycle)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid plan or billing cycle', 'invalid_plan');
    }

    const amount = billing_cycle === 'yearly' ? prices.yearly : prices.monthly;
    const orderId = generateOrderId(userId, plan_tier);
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

function hasConsultPaymentFields(body: unknown): body is {
  order_id: string;
  amount_krw: number;
  order_name: string;
} {
  return !!body
    && typeof body === 'object'
    && typeof (body as Record<string, unknown>).order_id === 'string'
    && typeof (body as Record<string, unknown>).order_name === 'string'
    && typeof (body as Record<string, unknown>).amount_krw === 'number';
}

function hasSubscriptionFields(body: unknown): body is {
  plan_tier: string;
  billing_cycle: string;
} {
  return !!body
    && typeof body === 'object'
    && typeof (body as Record<string, unknown>).plan_tier === 'string'
    && typeof (body as Record<string, unknown>).billing_cycle === 'string';
}
