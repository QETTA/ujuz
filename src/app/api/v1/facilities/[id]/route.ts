import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getFacilityById } from '@/lib/server/facility/facilityService';
import { objectIdSchema } from '@/lib/server/validation';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { getCacheValue, setCacheValue } from '@/lib/server/cache';

export const runtime = 'nodejs';

const FACILITY_DETAIL_CACHE_TTL_SECONDS = 300;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;

type FacilityDetailResponse = Awaited<ReturnType<typeof getFacilityById>>;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous';
}

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

    const clientIp = getClientIp(req);
    const { allowed } = await checkRateLimit(
      `facility-detail:${clientIp}`,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return errors.tooMany('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    }

    const cacheKey = `facility:detail:${id}`;
    const cached = getCacheValue<FacilityDetailResponse>(cacheKey);
    if (cached) {
      logRequest(req, 200, start, traceId);
      return NextResponse.json(cached);
    }

    const db = await getDbOrThrow();
    const facility = await getFacilityById(db, id);
    setCacheValue(cacheKey, facility, FACILITY_DETAIL_CACHE_TTL_SECONDS);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(facility);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
