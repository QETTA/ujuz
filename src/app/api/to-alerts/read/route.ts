import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDbOrThrow } from '@/lib/server/db';
import { getUserId, parseJson, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { U } from '@/lib/server/collections';
import { parseBody, markAlertsReadSchema } from '@/lib/server/validation';
import type { TOAlertDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

/**
 * PATCH /api/to-alerts/read
 * Mark alerts as read. Body: { alert_ids: string[] }
 * Ownership check: only alerts belonging to the user are updated.
 */
export async function PATCH(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(markAlertsReadSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { alert_ids } = parsed.data;
    const objectIds = alert_ids
      .filter((id) => /^[a-f\d]{24}$/i.test(id))
      .map((id) => new ObjectId(id));

    if (objectIds.length === 0) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'No valid alert IDs provided' }, { status: 400 });
    }

    const db = await getDbOrThrow();
    const result = await db.collection<TOAlertDoc>(U.TO_ALERTS).updateMany(
      {
        _id: { $in: objectIds },
        user_id: userId, // ownership check
      },
      { $set: { is_read: true } },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      modified: result.modifiedCount,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
