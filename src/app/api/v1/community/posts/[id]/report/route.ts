import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { reportSchema, anonIdSchema, objectIdSchema, parseBody } from '@/lib/server/validation';
import type { ReportDoc } from '@/lib/server/dbTypes';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

const POSTS_COLLECTION = U.POSTS;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id: postId } = await params;
    const postIdResult = objectIdSchema.safeParse(postId);
    if (!postIdResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(
        postIdResult.error.issues[0]?.message ?? '유효하지 않은 ID입니다',
        'invalid_post_id',
      );
    }

    const body = await parseJson(req);
    const parsed = parseBody(reportSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const reporterAnonId = anonIdSchema.parse(
      req.headers.get('x-anon-id') ?? req.headers.get('x-device-id') ?? 'anonymous',
    );

    const db = await getDbOrThrow();

    const post = await db.collection(POSTS_COLLECTION).findOne(
      { _id: new ObjectId(postIdResult.data), isHidden: { $ne: true }, status: { $ne: 'hidden' } },
    );
    if (!post) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }

    const doc: Omit<ReportDoc, '_id'> = {
      post_id: postId,
      reporter_anon_id: reporterAnonId,
      reason: parsed.data.reason,
      detail: parsed.data.detail,
      action: 'pending',
      created_at: new Date(),
    };

    const reportResult = await db.collection(U.REPORTS).insertOne(doc);

    const postResult = await db.collection(POSTS_COLLECTION).updateOne(
      {
        _id: post._id,
        isHidden: { $ne: true },
        status: { $ne: 'hidden' },
      },
      { $inc: { reportCount: 1 }, $set: { updatedAt: new Date(), updated_at: new Date() } },
    );

    if (postResult.matchedCount === 0) {
      await db.collection(U.REPORTS).deleteOne({ _id: reportResult.insertedId });
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }

    logRequest(req, 201, start, traceId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
