import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { overrideListQuerySchema, parseQuery } from '@/lib/server/validation';
import type { FacilityOverrideDoc } from '@/lib/server/dbTypes';
import { ObjectId, type Filter } from 'mongodb';

export const runtime = 'nodejs';

/** GET /api/v1/admin/overrides?facility_id=xxx&limit=50&cursor=xxx */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const parsed = parseQuery(overrideListQuerySchema, searchParams);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { facility_id, limit, cursor } = parsed.data;

    const db = await getDbOrThrow();
    const col = db.collection<FacilityOverrideDoc>(U.FACILITY_OVERRIDES);

    const filter: Filter<FacilityOverrideDoc> = {};
    if (facility_id) filter.facility_id = new ObjectId(facility_id);
    if (cursor) filter._id = { $lt: new ObjectId(cursor) };

    const docs = await col
      .find(filter)
      .sort({ applied_at: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const results = hasMore ? docs.slice(0, limit) : docs;

    const overrides = results.map((d) => ({
      id: d._id.toString(),
      facility_id: d.facility_id.toString(),
      field_path: d.field_path,
      old_value: d.old_value,
      new_value: d.new_value,
      reason: d.reason,
      applied_by: d.applied_by,
      applied_at: d.applied_at.toISOString(),
    }));

    const nextCursor = hasMore && results.length > 0
      ? results[results.length - 1]._id.toString()
      : null;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ overrides, nextCursor, hasMore });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
