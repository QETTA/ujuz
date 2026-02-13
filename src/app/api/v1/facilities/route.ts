import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { facilitySearchSchema, parseBody } from '@/lib/server/validation';
import { searchFacilities } from '@/lib/server/facility/facilityService';
import { U } from '@/lib/server/collections';
import type { FacilityDoc } from '@/lib/server/dbTypes';
import type { StrategyFacility } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);

    // ── Batch ID lookup: GET /api/v1/facilities?ids=stcode1,stcode2 ──
    // IDs are provider_id (stcode) values from strategy engine, not MongoDB ObjectIds
    const idsParam = searchParams.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean).slice(0, 20);

      if (ids.length === 0) {
        logRequest(req, 400, start, traceId);
        return errors.badRequest('No facility IDs provided', 'missing_facility_ids');
      }

      const db = await getDbOrThrow();
      const docs = await db.collection<FacilityDoc>(U.FACILITIES)
        .find({ provider_id: { $in: ids } })
        .toArray();

      const facilities: StrategyFacility[] = docs.map((doc) => {
        const coords = doc.location?.coordinates;
        return {
          id: doc.provider_id,
          name: doc.name,
          type: doc.type,
          location: coords ? { lat: coords[1], lng: coords[0] } : { lat: 0, lng: 0 },
          chips: [],
          extended: doc.extended_care ?? false,
          tags: [doc.type, doc.address?.sigungu].filter(Boolean) as string[],
        };
      });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({ facilities });
    }

    // ── Standard search ──
    const params = Object.fromEntries(searchParams.entries());

    const parsed = parseBody(facilitySearchSchema, params);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const db = await getDbOrThrow();
    const result = await searchFacilities(db, parsed.data);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
