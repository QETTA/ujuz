import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { auth } from '@/lib/server/auth';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';
import { checkOutput, sanitizeInput } from '@/lib/server/contentFilter';
import { AppError } from '@/lib/server/errors';
import type { PostDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

const COMMUNITY_CATEGORIES = ['질문', '정보공유', '후기', '자유'] as const;
const LEGACY_TYPES = ['review', 'to_report', 'question'] as const;
const categorySchema = z.enum(COMMUNITY_CATEGORIES);
const updateCommunityPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해 주세요').max(100, '제목은 100자 이내로 입력해 주세요').optional(),
  content: z.string().min(1, '내용을 입력해 주세요').max(2000, '내용은 2000자 이내로 입력해 주세요').optional(),
  category: categorySchema.optional(),
  region: z.string().min(1, '지역을 입력해 주세요').max(50, '지역은 50자 이내로 입력해 주세요').optional(),
}).superRefine((value, ctx) => {
  if (!value.title && !value.content && !value.category && !value.region) {
    ctx.addIssue({
      code: 'custom',
      message: '수정할 항목을 1개 이상 선택해 주세요',
      path: ['_'],
    });
  }
});

const typeToCategory = {
  review: '후기',
  to_report: '정보공유',
  question: '질문',
} as const;

const categoryToType = {
  질문: 'question',
  정보공유: 'to_report',
  후기: 'review',
  자유: 'review',
} as const;

function toLegacyType(category: keyof typeof categoryToType): keyof typeof typeToCategory {
  return categoryToType[category];
}

function maskPersonalInfo(value: string): string {
  return value
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[이메일]')
    .replace(/\b01[0-9]-?\d{3,4}-?\d{4}\b/g, '[전화번호]')
    .replace(/\b\d{6}-\d{7}\b/g, '[주민번호]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[카드번호]');
}

function sanitizePostField(value: string, fieldName: string): string {
  const input = sanitizeInput(value);
  if (!input.safe) {
    throw new AppError(`${fieldName}에 부적절한 내용이 포함되어 있습니다.`, 400, 'content_filter_rejected');
  }

  const output = checkOutput(input.sanitized);
  return maskPersonalInfo(output.cleaned).trim();
}

function isPostOwner(post: PostDoc, userId: string): boolean {
  return post.authorId === userId || post.anon_id === userId;
}

function isCommunityEnabled() {
  if (!FEATURE_FLAGS.communityWrite) {
    return NextResponse.json(
      { error: { code: 'feature_disabled', message: '커뮤니티 글쓰기는 아직 준비 중입니다' } },
      { status: 400 },
    );
  }
  return null;
}

function isHiddenDocument(post: Partial<PostDoc>): boolean {
  return post.isHidden === true || post.status === 'hidden';
}

function toPostType(post: Partial<PostDoc>): keyof typeof typeToCategory {
  if (post.type && post.type in typeToCategory) return post.type as keyof typeof typeToCategory;
  if (post.category === '질문') return 'question';
  if (post.category === '정보공유') return 'to_report';
  if (post.category === '후기') return 'review';
  return 'review';
}

/** GET /api/v1/community/posts/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 게시글 ID입니다', 'invalid_post_id');
    }

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);
    const post = await col.findOne(
      { _id: new ObjectId(id), isHidden: { $ne: true }, status: { $ne: 'hidden' } },
    );

    if (!post) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }

    const createdAt = post.createdAt ?? post.created_at ?? post.updatedAt ?? post.updated_at ?? new Date();
    const updatedAt = post.updatedAt ?? post.updated_at ?? createdAt;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      id: post._id.toString(),
      _id: post._id.toString(),
      title: post.title ?? '',
      content: post.content,
      type: toPostType(post),
      category: post.category ?? typeToCategory[post.type ?? 'review'],
      region: post.region ?? post.board_region ?? '',
      likes: post.likeCount ?? 0,
      likeCount: post.likeCount ?? 0,
      comment_count: post.commentCount ?? 0,
      commentCount: post.commentCount ?? 0,
      reportCount: post.reportCount ?? 0,
      report_count: post.reportCount ?? 0,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      authorName: post.authorName ?? post.anon_handle ?? '익명',
      author_nickname: post.authorName ?? post.anon_handle ?? '익명',
      isHidden: post.isHidden,
      status: post.status,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

/** PATCH /api/v1/community/posts/[id] — edit own post */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  const featureDisabled = isCommunityEnabled();
  if (featureDisabled) {
    return featureDisabled;
  }

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

    const body = await parseJson(req);
    const parsed = updateCommunityPostSchema.safeParse(body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error.flatten().formErrors.join(', '), 'validation_error');
    }

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }

    if (!isPostOwner(existing, session.userId)) {
      logRequest(req, 403, start, traceId);
      return errors.forbidden('본인의 게시글만 수정할 수 있습니다', 'not_post_owner');
    }

    if (isHiddenDocument(existing)) {
      logRequest(req, 410, start, traceId);
      return errors.badRequest('삭제된 게시글입니다', 'post_deleted');
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      updatedAt: now,
      updated_at: now,
    };

    if (parsed.data.title !== undefined) {
      updates.title = sanitizePostField(parsed.data.title, '제목');
    }

    if (parsed.data.content !== undefined) {
      updates.content = sanitizePostField(parsed.data.content, '내용');
    }

    if (parsed.data.region !== undefined) {
      const region = sanitizePostField(parsed.data.region, '지역');
      updates.region = region;
      updates.board_region = region;
    }

    if (parsed.data.category !== undefined) {
      updates.category = parsed.data.category;
      updates.type = toLegacyType(parsed.data.category);
    }

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

  const featureDisabled = isCommunityEnabled();
  if (featureDisabled) {
    return featureDisabled;
  }

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
    const col = db.collection<PostDoc>(U.POSTS);
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('게시글을 찾을 수 없습니다', 'post_not_found');
    }

    if (!isPostOwner(existing, session.userId)) {
      logRequest(req, 403, start, traceId);
      return errors.forbidden('본인의 게시글만 삭제할 수 있습니다', 'not_post_owner');
    }

    const now = new Date();
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isHidden: true, status: 'hidden', updatedAt: now, updated_at: now } },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PATCH(req, context);
}
