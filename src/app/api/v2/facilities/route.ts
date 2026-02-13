import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errors } from '@/lib/server/apiError';
import { getTraceId, logRequest, errorResponse } from '@/lib/server/apiHelpers';

export const runtime = 'nodejs';

/**
 * Mobile-optimized facility search.
 * Returns minimal fields for list/map display.
 * 
 * GET /api/v2/facilities?lat=37.5&lng=127.0&radius=3000&limit=50&type=어린이집
 * GET /api/v2/facilities?q=강남구+어린이집&limit=20
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = Number(searchParams.get('radius') ?? '3000');
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    const cursor = searchParams.get('cursor');

    const db = await getDbOrThrow();
    const col = db.collection('facilities');

    let filter: Record<string, unknown> = {};
    let sort: Record<string, 1 | -1> = { _id: -1 };

    // Geo query (nearby)
    if (lat && lng) {
      filter.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: radius,
        },
      };
    }

    // Text search
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
      ];
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Cursor pagination
    if (cursor) {
      filter._id = { ...(filter._id as object ?? {}), $lt: new (await import('mongodb')).ObjectId(cursor) };
    }

    const docs = await col
      .find(filter)
      .sort(sort)
      .limit(limit + 1)
      .project({
        name: 1,
        type: 1,
        address: 1,
        location: 1,
        grade: 1,
        capacity: 1,
        current_count: 1,
        phone: 1,
      })
      .toArray();

    const hasMore = docs.length > limit;
    const results = hasMore ? docs.slice(0, limit) : docs;

    const facilities = results.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      type: d.type,
      address: d.address,
      lat: d.location?.coordinates?.[1] ?? null,
      lng: d.location?.coordinates?.[0] ?? null,
      grade: d.grade ?? null,
      capacity: d.capacity ?? null,
      current_count: d.current_count ?? null,
      phone: d.phone ?? null,
    }));

    const nextCursor = hasMore && results.length > 0
      ? results[results.length - 1]._id.toString()
      : null;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ facilities, nextCursor, hasMore, total: facilities.length });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
