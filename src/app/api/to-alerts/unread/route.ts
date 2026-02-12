import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { U } from '@/lib/server/collections';
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
    const db = await getDbOrThrow();

    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since');
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 50);

    const filter: Record<string, unknown> = {
      user_id: userId,
      is_read: false,
    };

    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        filter.detected_at = { $gt: sinceDate };
      }
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
