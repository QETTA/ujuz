import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/server/auth';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import type { PostDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

interface LikedPostState {
  _id: ObjectId;
  likeCount?: number;
  likedBy?: string[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const session = await auth();
    if (!session?.userId) {
      logRequest(req, 401, start, traceId);
      return errors.unauthorized('로그인이 필요합니다', 'auth_required');
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 게시글 ID입니다', 'invalid_post_id');
    }

    const db = await getDbOrThrow();
    const posts = db.collection<PostDoc>(U.POSTS);
    const now = new Date();
    const result = await posts.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        isHidden: { $ne: true },
        status: { $ne: 'hidden' },
      },
      [
        {
          $set: {
            likedBy: { $ifNull: ['$likedBy', []] },
            likeCount: { $ifNull: ['$likeCount', 0] },
          },
        },
        {
          $set: {
            likedBy: {
              $cond: [
                { $in: [session.userId, '$likedBy'] },
                {
                  $filter: {
                    input: '$likedBy',
                    as: 'uid',
                    cond: { $ne: ['$$uid', session.userId] },
                  },
                },
                { $concatArrays: ['$likedBy', [session.userId]] },
              ],
            },
            likeCount: {
              $cond: [
                { $in: [session.userId, '$likedBy'] },
                { $max: [{ $subtract: ['$likeCount', 1] }, 0] },
                { $add: ['$likeCount', 1] },
              ],
            },
            updatedAt: now,
            updated_at: now,
          },
        },
      ],
      {
        returnDocument: 'after',
        projection: { _id: 1, likeCount: 1, likedBy: 1 },
      },
    );

    const updated = (result as unknown as { value?: LikedPostState | null })?.value ?? result as unknown as LikedPostState | null;
    if (!updated) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }

    const liked = Array.isArray(updated.likedBy) && updated.likedBy.includes(session.userId);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      id,
      _id: id,
      liked,
      likeCount: updated.likeCount ?? 0,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
