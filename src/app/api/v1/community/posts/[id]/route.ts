import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { apiError, errors } from '@/lib/server/apiError';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';
import { communityPostUpdateSchema, objectIdSchema, anonIdSchema, parseBody } from '@/lib/server/validation';
import type { PostDoc } from '@/lib/server/dbTypes';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

/** PUT /api/v1/community/posts/[id] — edit own post */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  if (!FEATURE_FLAGS.communityWrite) {
    logRequest(req, 400, start, traceId);
    return NextResponse.json(
      { error: '커뮤니티 글쓰기는 아직 준비 중입니다', code: 'feature_disabled' },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 게시글 ID입니다', 'invalid_post_id');
    }

    const anonId = anonIdSchema.parse(req.headers.get('x-anon-id') ?? 'anonymous');

    const body = await parseJson(req);
    const parsed = parseBody(communityPostUpdateSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);

    // Ownership check
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }
    if (existing.anon_id !== anonId) {
      logRequest(req, 403, start, traceId);
      return errors.forbidden('본인의 게시글만 수정할 수 있습니다', 'not_post_owner');
    }
    if (existing.status === 'hidden') {
      logRequest(req, 410, start, traceId);
      return apiError('삭제된 게시글입니다', 'post_deleted', 410);
    }

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.structured_fields !== undefined) updates.structured_fields = parsed.data.structured_fields;

    await col.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

/** DELETE /api/v1/community/posts/[id] — soft-delete own post */
export async function DELETE(
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
      return errors.badRequest('유효하지 않은 게시글 ID입니다', 'invalid_post_id');
    }

    const anonId = anonIdSchema.parse(req.headers.get('x-anon-id') ?? 'anonymous');

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);

    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }
    if (existing.anon_id !== anonId) {
      logRequest(req, 403, start, traceId);
      return errors.forbidden('본인의 게시글만 삭제할 수 있습니다', 'not_post_owner');
    }

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'hidden' as const, updated_at: new Date() } },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
