import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getCacheValue, setCacheValue } from '@/lib/server/cache';

const DASHBOARD_CACHE_TTL_SECONDS = 30;

export const runtime = 'nodejs';

/**
 * Mobile dashboard aggregation.
 * Returns all dashboard stats in one request to minimize round trips.
 * 
 * GET /api/v2/dashboard
 * Requires authentication (x-device-id or session cookie).
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);

    const cacheKey = `dashboard:${userId}`;
    const cached = getCacheValue<unknown>(cacheKey);
    if (cached) {
      logRequest(req, 200, start, traceId);
      return NextResponse.json(cached);
    }

    const db = await getDbOrThrow();

    // Run all queries in parallel
    const [
      unreadAlerts,
      activeSubscriptions,
      recentAlerts,
      totalFacilities,
    ] = await Promise.all([
      // Unread alert count
      db.collection(U.TO_ALERTS).countDocuments({
        user_id: userId,
        is_read: false,
      }),

      // Active subscription count
      db.collection(U.TO_SUBSCRIPTIONS).countDocuments({
        user_id: userId,
        is_active: true,
      }),

      // Recent 5 alerts
      db.collection(U.TO_ALERTS)
        .find({ user_id: userId })
        .sort({ detected_at: -1 })
        .limit(5)
        .project({
          facility_name: 1,
          age_class: 1,
          estimated_slots: 1,
          confidence: 1,
          detected_at: 1,
          is_read: 1,
        })
        .toArray(),

      // Total tracked facilities (approximate)
      db.collection(U.FACILITIES).estimatedDocumentCount(),
    ]);

    const recentAlertsMapped = recentAlerts.map((a) => ({
      id: a._id.toString(),
      facility_name: a.facility_name,
      age_class: a.age_class,
      estimated_slots: a.estimated_slots,
      confidence: a.confidence,
      detected_at: a.detected_at instanceof Date ? a.detected_at.toISOString() : String(a.detected_at),
      is_read: a.is_read,
    }));

    const payload = {
      unread_alerts: unreadAlerts,
      active_subscriptions: activeSubscriptions,
      recent_alerts: recentAlertsMapped,
      total_facilities: totalFacilities,
      generated_at: new Date().toISOString(),
    };
    setCacheValue(cacheKey, payload, DASHBOARD_CACHE_TTL_SECONDS);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(payload);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
