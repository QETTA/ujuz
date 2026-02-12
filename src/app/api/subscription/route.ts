import { NextRequest, NextResponse } from 'next/server';
import { getDisplayPlans, getUserSubscription, createSubscription, cancelSubscription } from '@/lib/server/subscriptionService';
import { getUserId, errorResponse, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { subscriptionCreateSchema, parseBody } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'plans') {
      logRequest(req, 200, start, traceId);
      return NextResponse.json(getDisplayPlans());
    }

    const subscription = await getUserSubscription(userId);
    logRequest(req, 200, start, traceId);
    if (subscription) {
      return NextResponse.json({ subscription });
    }
    return NextResponse.json({ subscription: null });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(subscriptionCreateSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    const result = await createSubscription(
      userId,
      data.plan_tier,
      data.billing_cycle,
    );

    logRequest(req, 201, start, traceId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function DELETE(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    await cancelSubscription(userId);
    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
