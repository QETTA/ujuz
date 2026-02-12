import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';
import { communityPostSchema, parseBody } from '@/lib/server/validation';
import type { PostDoc } from '@/lib/server/dbTypes';
import { ObjectId, type Sort } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { searchParams } = new URL(req.url);
    const region = searchParams.get('region') || '';
    const type = searchParams.get('type') || 'review';
    const sort = searchParams.get('sort') || 'recent';
    const cursor = searchParams.get('cursor') || '';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);

    const filter: Record<string, unknown> = {
      type,
      status: 'published',
    };
    if (region) filter.board_region = region;
    if (cursor) filter._id = { $lt: new ObjectId(cursor) };

    const sortField: Sort = sort === 'hot'
      ? { score: -1, created_at: -1 }
      : { created_at: -1 };

    const docs = await col
      .find(filter)
      .sort(sortField)
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const results = hasMore ? docs.slice(0, limit) : docs;

    const posts = results.map((d) => ({
      id: d._id.toString(),
      anon_handle: d.anon_handle,
      type: d.type,
      structured_fields: d.structured_fields,
      content: d.content,
      score: d.score,
      created_at: d.created_at.toISOString(),
    }));

    const nextCursor = hasMore && results.length > 0
      ? results[results.length - 1]._id.toString()
      : null;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ posts, nextCursor, hasMore });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  // Feature flag OFF
  if (!FEATURE_FLAGS.communityWrite) {
    logRequest(req, 400, start, traceId);
    return NextResponse.json(
      { error: '커뮤니티 글쓰기는 아직 준비 중입니다', code: 'feature_disabled' },
      { status: 400 },
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = parseBody(communityPostSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data = parsed.data;
    const anonId = req.headers.get('x-anon-id') || 'anonymous';

    const db = await getDbOrThrow();
    const doc: Omit<PostDoc, '_id'> = {
      anon_id: anonId,
      anon_handle: '익명',
      board_region: data.board_region,
      type: data.type,
      structured_fields: data.structured_fields ?? {},
      content: data.content,
      score: 0,
      status: 'published',
      created_at: new Date(),
    };

    const result = await db.collection(U.POSTS).insertOne(doc);

    logRequest(req, 201, start, traceId);
    return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
