import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { U } from '@/lib/server/collections';
import { toAlertUnreadQuerySchema, parseQuery } from '@/lib/server/validation';
import type { TOAlertDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

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
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { since, limit } = parsed.data;

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

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      alerts: mapped,
      unread_count: totalUnread,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
