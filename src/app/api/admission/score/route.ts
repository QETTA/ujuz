import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { calculateAdmissionScoreV2, toAgeBandStr } from '@/lib/server/admissionEngineV2';
import { mapEngineToFrontend } from '@/lib/server/mappers';
import { errorResponse, getUserId, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { extractRegionFromAddress } from '@/lib/server/extractRegion';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { admissionScoreSchema, parseBody } from '@/lib/server/validation';
import type { PlaceDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const { allowed } = await checkRateLimit(`admission:${userId}`, 10, 60_000);
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return errors.tooMany('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    }

    const body = await parseJson(req);
    const parsed = parseBody(admissionScoreSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }
    const data = parsed.data;

    const db = await getDbOrThrow();
    const facilityDoc = await db.collection<PlaceDoc>(env.MONGODB_PLACES_COLLECTION).findOne(
      { $or: [{ placeId: data.facility_id }, { facility_id: data.facility_id }] },
      { projection: { placeId: 1, facility_id: 1, name: 1, address: 1 } },
    );

    const ageBandStr = toAgeBandStr(data.child_age_band);
    const result = await calculateAdmissionScoreV2({
      facility_id: data.facility_id,
      child_age_band: ageBandStr,
      waiting_position: data.waiting_position,
      priority_type: data.priority_type,
    });

    const frontend = mapEngineToFrontend(result, data.child_age_band);
    const regionKey = facilityDoc ? extractRegionFromAddress(facilityDoc.address) : null;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      result: frontend,
      facility: {
        id: data.facility_id,
        name: facilityDoc?.name ?? '',
        address: facilityDoc?.address ?? '',
        regionKey: regionKey ?? '',
      },
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
