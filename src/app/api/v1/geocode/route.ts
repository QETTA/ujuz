import { NextRequest, NextResponse } from 'next/server';

import { errors } from '@/lib/server/apiError';
import { getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

type KakaoMode = 'address' | 'keyword';

type KakaoKeywordDocument = {
  place_name?: unknown;
  address_name?: unknown;
  x?: unknown;
  y?: unknown;
  category_name?: unknown;
  phone?: unknown;
  place_url?: unknown;
};

type KakaoAddressDocument = {
  address_name?: unknown;
  x?: unknown;
  y?: unknown;
  road_address?: unknown;
};

type KakaoResponse = {
  documents?: Array<KakaoKeywordDocument | KakaoAddressDocument>;
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_COUNT = 60;

function isRateLimited(req: NextRequest): boolean {
  const key =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anonymous';

  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_COUNT;
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  if (isRateLimited(req)) {
    logRequest(req, 429, start, traceId);
    return NextResponse.json(
      { error: { code: 'geocode_rate_limited', message: 'Too many requests' } },
      { status: 429 },
    );
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    logger.error('KAKAO_REST_API_KEY not configured');
    logRequest(req, 500, start, traceId);
    return errors.internal('Geocoding service not configured', 'geocode_not_configured');
  }

  const { searchParams } = new URL(req.url);
  const modeParam = searchParams.get('mode') ?? 'address';
  const mode = modeParam === 'keyword' ? 'keyword' : 'address';
  const query = searchParams.get('query');

  if (!query || query.trim().length === 0) {
    logRequest(req, 400, start, traceId);
    return errors.badRequest('query parameter is required', 'missing_query');
  }

  try {
    let kakaoUrl: string;

    if (mode === 'keyword') {
      const x = searchParams.get('x') ?? '';
      const y = searchParams.get('y') ?? '';
      const radius = searchParams.get('radius') ?? '3000';
      const size = searchParams.get('size') ?? '15';

      const params = new URLSearchParams({ query, size });
      if (x && y) {
        params.set('x', x);
        params.set('y', y);
        params.set('radius', radius);
        params.set('sort', 'distance');
      }

      kakaoUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`;
    } else {
      const params = new URLSearchParams({ query });
      kakaoUrl = `https://dapi.kakao.com/v2/local/search/address.json?${params}`;
    }

    const response = await fetch(kakaoUrl, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });

    if (!response.ok) {
      logger.error('Kakao API error', { status: response.status, mode: mode as KakaoMode });
      logRequest(req, 502, start, traceId);
      return NextResponse.json(
        { error: { code: 'geocode_upstream_error', message: 'Geocoding service error' } },
        { status: 502 },
      );
    }

    const data = (await response.json()) as KakaoResponse;
    const documents = Array.isArray(data.documents) ? data.documents : [];

    const results = documents.map((doc) => {
      if (mode === 'keyword') {
        const keywordDoc = doc as KakaoKeywordDocument;
        return {
          place_name: keywordDoc.place_name,
          address_name: keywordDoc.address_name,
          x: keywordDoc.x,
          y: keywordDoc.y,
          category_name: keywordDoc.category_name,
          phone: keywordDoc.phone,
          place_url: keywordDoc.place_url,
        };
      }

      const addressDoc = doc as KakaoAddressDocument;
      return {
        address_name: addressDoc.address_name,
        x: addressDoc.x,
        y: addressDoc.y,
        road_address: addressDoc.road_address ?? null,
      };
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ results, mode, total: results.length });
  } catch (error) {
    logger.error('Geocode proxy error', {
      error: error instanceof Error ? error.message : String(error),
    });
    logRequest(req, 500, start, traceId);
    return errors.internal('Geocoding failed', 'geocode_error');
  }
}
