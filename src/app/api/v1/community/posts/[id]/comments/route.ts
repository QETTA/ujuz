import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDbOrThrow } from '@/lib/server/db';
import { errors } from '@/lib/server/apiError';
import { getTraceId, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { anonIdSchema } from '@/lib/server/validation';

export const runtime = 'nodejs';

const COMMENTS_COLLECTION = 'comments';
const POSTS_COLLECTION = 'posts';

interface CommentDoc {
  _id: ObjectId;
  post_id: string;
  parent_id?: string;
  anon_id: string;
  anon_handle: string;
  content: string;
  status: 'published' | 'hidden';
  created_at: Date;
  updated_at?: Date;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — list comments for a post
export async function GET(req: NextRequest, context: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id: postId } = await context.params;

    if (!ObjectId.isValid(postId)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid post ID', 'invalid_id');
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

    const db = await getDbOrThrow();

    const filter: Record<string, unknown> = {
      post_id: postId,
      status: 'published',
    };
    if (cursor) {
      if (!ObjectId.isValid(cursor)) {
        logRequest(req, 400, start, traceId);
        return errors.badRequest('Invalid cursor', 'invalid_cursor');
      }
      filter._id = { $gt: new ObjectId(cursor) };
    }

    const docs = await db
      .collection<CommentDoc>(COMMENTS_COLLECTION)
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const results = hasMore ? docs.slice(0, limit) : docs;

    const comments = results.map((d) => ({
      id: d._id.toString(),
      post_id: d.post_id,
      parent_id: d.parent_id ?? null,
      anon_handle: d.anon_handle,
      content: d.content,
      created_at: d.created_at.toISOString(),
    }));

    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1]._id.toString() : null;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ comments, nextCursor, hasMore });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

// POST — create a new comment
export async function POST(req: NextRequest, context: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id: postId } = await context.params;

    if (!ObjectId.isValid(postId)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid post ID', 'invalid_id');
    }

    const rawAnonId = req.headers.get('x-anon-id');
    if (!rawAnonId) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Missing x-anon-id header', 'invalid_anon_id');
    }

    let anonId: string;
    try {
      anonId = anonIdSchema.parse(rawAnonId);
    } catch {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid anon ID', 'invalid_anon_id');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid JSON', 'invalid_json');
    }

    if (!body || typeof body !== 'object') {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Request body required', 'missing_body');
    }

    const { content, parent_id } = body as { content?: string; parent_id?: string };

    if (!content || typeof content !== 'string' || content.trim().length === 0 || content.length > 500) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('content must be 1-500 characters', 'invalid_content');
    }

    if (parent_id !== undefined && !ObjectId.isValid(parent_id)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid parent_id', 'invalid_parent_id');
    }

    const db = await getDbOrThrow();

    const post = await db.collection(POSTS_COLLECTION).findOne(
      { _id: new ObjectId(postId), status: 'published' },
      { projection: { _id: 1 } },
    );

    if (!post) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('Post not found', 'post_not_found');
    }

    if (parent_id) {
      const parent = await db.collection<CommentDoc>(COMMENTS_COLLECTION).findOne(
        { _id: new ObjectId(parent_id), post_id: postId, status: 'published' },
        { projection: { _id: 1 } },
      );
      if (!parent) {
        logRequest(req, 404, start, traceId);
        return errors.notFound('Parent comment not found', 'parent_not_found');
      }
    }

    const doc: Omit<CommentDoc, '_id'> = {
      post_id: postId,
      ...(parent_id && { parent_id }),
      anon_id: anonId,
      anon_handle: '익명',
      content: content.trim(),
      status: 'published',
      created_at: new Date(),
    };

    const result = await db.collection(COMMENTS_COLLECTION).insertOne(doc);

    logRequest(req, 201, start, traceId);
    return NextResponse.json({ id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
