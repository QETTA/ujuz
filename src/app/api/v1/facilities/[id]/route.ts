import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getFacilityById } from '@/lib/server/facility/facilityService';
import { objectIdSchema } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id } = await params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid facility ID', 'invalid_facility_id');
    }

    const db = await getDbOrThrow();
    const facility = await getFacilityById(db, id);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(facility);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
