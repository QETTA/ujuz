import { NextRequest, NextResponse } from 'next/server';
import { createSubscription, getUserSubscriptions, deleteSubscription } from '@/lib/server/toAlertService';
import { getUserId, errorResponse, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { toAlertSubscribeSchema, parseBody } from '@/lib/server/validation';
import { checkLimit } from '@/lib/server/subscriptionService';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import type { TOSubscriptionDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const result = await getUserSubscriptions(userId);
    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
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

    const { allowed } = await checkRateLimit(`to-alerts:${userId}`, 10, 60_000);
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
    }

    const body = await parseJson(req);
    const parsed = parseBody(toAlertSubscribeSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const data = parsed.data;

    // Check slot limit
    const limitCheck = await checkLimit(userId, 'to_alerts_slots');
    if (!limitCheck.allowed) {
      logRequest(req, 403, start, traceId);
      return NextResponse.json({
        error: 'TO 알림 슬롯 한도에 도달했습니다',
        code: 'limit_exceeded',
        remaining: limitCheck.remaining,
        upgradeNeeded: limitCheck.upgradeNeeded,
      }, { status: 403 });
    }

    const result = await createSubscription({
      user_id: userId,
      facility_id: data.facility_id,
      facility_name: data.facility_name,
      target_classes: data.target_classes,
      notification_preferences: data.notification_preferences,
    });

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
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get('facility_id');

    if (!facilityId) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
    }

    await deleteSubscription(userId, facilityId);
    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function PATCH(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);

    let body: { facility_id?: string; active?: boolean };
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { facility_id, active } = body;
    if (!facility_id || typeof active !== 'boolean') {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'facility_id and active (boolean) are required' }, { status: 400 });
    }

    const db = await getDbOrThrow();
    const result = await db.collection<TOSubscriptionDoc>(U.TO_SUBSCRIPTIONS).updateOne(
      { user_id: userId, facility_id },
      { $set: { is_active: active } },
    );

    if (result.matchedCount === 0) {
      logRequest(req, 404, start, traceId);
      return NextResponse.json({ error: '해당 구독을 찾을 수 없습니다' }, { status: 404 });
    }

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true, facility_id, active });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
