import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { U } from '@/lib/server/collections';
import { toAlertUnreadQuerySchema, parseQuery } from '@/lib/server/validation';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { getCacheValue, setCacheValue } from '@/lib/server/cache';
import type { TOAlertDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

const TO_ALERT_UNREAD_CACHE_TTL_SECONDS = 15;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;

type UnreadAlertsResponse = {
  alerts: Array<{
    id: string;
    facility_id: string;
    facility_name: string;
    age_class: string;
    detected_at: string;
    estimated_slots: number;
    confidence: number;
    is_read: boolean;
    source: string;
  }>;
  unread_count: number;
};

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous';
}

function getUnreadCacheKey(userId: string, since: string | undefined, limit: number): string {
  return `to-alerts:unread:${userId}:${since ?? 'none'}:${limit}`;
}

/**
 * GET /api/to-alerts/unread?since=ISO&limit=20
 * Returns unread TO alerts for the authenticated user (polling endpoint).
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);

    const { searchParams } = new URL(req.url);
    const parsed = parseQuery(toAlertUnreadQuerySchema, searchParams);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const { since, limit } = parsed.data;

    const clientIp = getClientIp(req);
    const { allowed } = await checkRateLimit(
      `to-alerts-unread:${clientIp}`,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return errors.tooMany('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    }

    const cacheKey = getUnreadCacheKey(userId, since, limit);
    const cached = getCacheValue<UnreadAlertsResponse>(cacheKey);
    if (cached) {
      logRequest(req, 200, start, traceId);
      return NextResponse.json(cached);
    }

    const db = await getDbOrThrow();
    const filter: Record<string, unknown> = {
      user_id: userId,
      is_read: false,
    };

    if (since) {
      filter.detected_at = { $gt: new Date(since) };
    }

    const alerts = await db
      .collection<TOAlertDoc>(U.TO_ALERTS)
      .find(filter)
      .sort({ detected_at: -1 })
      .limit(limit)
      .toArray();

    const totalUnread = await db
      .collection<TOAlertDoc>(U.TO_ALERTS)
      .countDocuments({ user_id: userId, is_read: false });

    const mapped = alerts.map((a) => ({
      id: a._id.toString(),
      facility_id: a.facility_id,
      facility_name: a.facility_name,
      age_class: a.age_class,
      detected_at: a.detected_at.toISOString(),
      estimated_slots: a.estimated_slots ?? 1,
      confidence: a.confidence ?? 0.6,
      is_read: false,
      source: a.source ?? 'auto_detection',
    }));

    const payload: UnreadAlertsResponse = {
      alerts: mapped,
      unread_count: totalUnread,
    };
    setCacheValue(cacheKey, payload, TO_ALERT_UNREAD_CACHE_TTL_SECONDS);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(payload);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
