import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { env } from '@/lib/server/env';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { escapeRegex, REGION_SEARCH_MAP } from '@/lib/server/searchUtils';
import type { PlaceDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    await getUserId(req);

    const { searchParams } = req.nextUrl;
    const q = searchParams.get('q')?.trim();
    const region = searchParams.get('region')?.trim();
    const limitParam = Math.min(Number(searchParams.get('limit')) || 10, 30);

    if (!q || q.length < 1) {
      logRequest(req, 200, start, traceId);
      return NextResponse.json({ results: [] });
    }

    const db = await getDbOrThrow();

    const query: Record<string, unknown> = {
      name: { $regex: escapeRegex(q), $options: 'i' },
    };

    if (region && REGION_SEARCH_MAP[region]) {
      const regionKeywords = REGION_SEARCH_MAP[region];
      query.address = { $regex: regionKeywords.join('|'), $options: 'i' };
    }

    const docs = await db.collection<PlaceDoc>(env.MONGODB_PLACES_COLLECTION)
      .find(query as Partial<PlaceDoc>, {
        projection: { placeId: 1, facility_id: 1, name: 1, address: 1, capacity: 1 },
        collation: { locale: 'ko', strength: 2 },
      })
      .limit(limitParam)
      .toArray();

    const results = docs.map((doc) => ({
      id: doc.placeId ?? doc.facility_id ?? doc._id.toString(),
      name: doc.name,
      address: doc.address ?? '',
      capacity: typeof doc.capacity === 'number' ? doc.capacity : undefined,
    }));

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ results });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
