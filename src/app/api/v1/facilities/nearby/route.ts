import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { facilityNearbySchema, parseBody } from '@/lib/server/validation';
import { findNearbyFacilities } from '@/lib/server/facility/facilityService';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = parseBody(facilityNearbySchema, params);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = await getDbOrThrow();
    const facilities = await findNearbyFacilities(db, parsed.data);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ facilities });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
