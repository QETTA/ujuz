import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { facilityNearbySchema, parseBody } from '@/lib/server/validation';
import { findNearbyFacilities } from '@/lib/server/facility/facilityService';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { getCacheValue, setCacheValue } from '@/lib/server/cache';

export const runtime = 'nodejs';

const NEARBY_CACHE_TTL_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;

type NearbyResponse = {
  facilities: Awaited<ReturnType<typeof findNearbyFacilities>>;
};

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous';
}

function getNearbyCacheKey(params: {
  lng: number;
  lat: number;
  radius_m: number;
  limit: number;
}): string {
  return `facilities:nearby:${params.lng}:${params.lat}:${params.radius_m}:${params.limit}`;
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());

    const parsed = parseBody(facilityNearbySchema, params);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const clientIp = getClientIp(req);
    const { allowed } = await checkRateLimit(
      `facilities-nearby:${clientIp}`,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return errors.tooMany('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    }

    const cacheKey = getNearbyCacheKey(parsed.data);
    const cached = getCacheValue<NearbyResponse>(cacheKey);
    if (cached) {
      logRequest(req, 200, start, traceId);
      return NextResponse.json(cached);
    }

    const db = await getDbOrThrow();
    const facilities = await findNearbyFacilities(db, parsed.data);
    const payload: NearbyResponse = { facilities };
    setCacheValue(cacheKey, payload, NEARBY_CACHE_TTL_SECONDS);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(payload);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
