import { NextRequest, NextResponse } from 'next/server';
import { ObjectId, type Sort } from 'mongodb';
import { z } from 'zod';
import { auth } from '@/lib/server/auth';
import { checkLimit, incrementFeatureUsage } from '@/lib/server/subscriptionService';
import { checkOutput, sanitizeInput } from '@/lib/server/contentFilter';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';
import { AppError } from '@/lib/server/errors';
import type { PostDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

const COMMUNITY_CATEGORIES = ['질문', '정보공유', '후기', '자유'] as const;
const LEGACY_TYPES = ['review', 'to_report', 'question'] as const;
const QUERY_TYPES = [...COMMUNITY_CATEGORIES, ...LEGACY_TYPES] as const;

type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];
type LegacyPostType = (typeof LEGACY_TYPES)[number];
type PostQueryType = (typeof QUERY_TYPES)[number];

const CATEGORY_TO_TYPE: Record<CommunityCategory, LegacyPostType> = {
  질문: 'question',
  정보공유: 'to_report',
  후기: 'review',
  자유: 'review',
};

const TYPE_TO_CATEGORY: Record<LegacyPostType, CommunityCategory> = {
  review: '후기',
  to_report: '정보공유',
  question: '질문',
};

const communityPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해 주세요').max(100, '제목은 100자 이내로 입력해 주세요'),
  content: z.string().min(1, '내용을 입력해 주세요').max(2000, '내용은 2000자 이내로 입력해 주세요'),
  category: z.enum(COMMUNITY_CATEGORIES),
  region: z.string().min(1, '지역을 입력해 주세요').max(50, '지역은 50자 이내로 입력해 주세요'),
  anonymous: z.boolean().default(false),
});

const postQuerySchema = z.object({
  region: z.string().max(50).default(''),
  type: z.enum(QUERY_TYPES).default('후기'),
  sort: z.enum(['recent', 'hot']).default('recent'),
  cursor: z.string().regex(/^[a-f\d]{24}$/i, '유효하지 않은 cursor 값입니다').optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function isCommunityCategory(value: string): value is CommunityCategory {
  return COMMUNITY_CATEGORIES.includes(value as CommunityCategory);
}

function isLegacyType(value: string): value is LegacyPostType {
  return LEGACY_TYPES.includes(value as LegacyPostType);
}

function toLegacyType(value: string): LegacyPostType {
  if (isLegacyType(value)) return value;
  return CATEGORY_TO_TYPE[value as CommunityCategory] ?? '후기';
}

function toCategoryLabel(value: string): CommunityCategory {
  if (isCommunityCategory(value)) return value;
  return TYPE_TO_CATEGORY[value as LegacyPostType] ?? '후기';
}

function toPostType(doc: Partial<PostDoc>): LegacyPostType {
  if (isCommunityCategory(doc.category ?? '')) return CATEGORY_TO_TYPE[doc.category as CommunityCategory] ?? 'review';
  if (isLegacyType(doc.type ?? '')) return doc.type as LegacyPostType;
  return 'review';
}

function toCategory(doc: Partial<PostDoc>): CommunityCategory {
  if (isCommunityCategory(doc.category ?? '')) return doc.category as CommunityCategory;
  if (isLegacyType(doc.type ?? '')) return TYPE_TO_CATEGORY[doc.type as LegacyPostType];
  return '후기';
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

function applyContentLimits(value: string, max: number): string {
  const normalized = value.trim();
  if (normalized.length > max) throw new AppError('입력 길이를 초과했습니다', 400, 'validation_error');
  return normalized;
}

function toSafeDate(value: unknown): Date {
  return value instanceof Date ? value : new Date();
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const queryResult = postQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    if (!queryResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(queryResult.error.flatten().formErrors.join(', '), 'validation_error');
    }

    const { region, type, sort, cursor, limit } = queryResult.data;

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);

    const andFilters: Record<string, unknown>[] = [
      { isHidden: { $ne: true } },
      { status: { $ne: 'hidden' } },
    ];

    andFilters.push({
      $or: [
        { type: toLegacyType(type) },
        { category: toCategoryLabel(type) },
      ],
    });

    if (region) {
      andFilters.push({ $or: [{ board_region: region }, { region }] });
    }

    if (cursor) {
      andFilters.push({ _id: { $lt: new ObjectId(cursor) } });
    }

    const filter = andFilters.length === 1
      ? andFilters[0]
      : { $and: andFilters };

    const sortField: Sort = sort === 'hot'
      ? { likeCount: -1, score: -1, createdAt: -1, created_at: -1 }
      : { createdAt: -1, created_at: -1 };

    const docs = await col
      .find(filter)
      .sort(sortField)
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const results = hasMore ? docs.slice(0, limit) : docs;

    const posts = results.map((d) => {
      const postType = toPostType(d);
      const categoryLabel = toCategory(d);
      const createdAt = toSafeDate(d.createdAt ?? d.created_at ?? d.updatedAt ?? d.updated_at);

      return {
        _id: d._id.toString(),
        id: d._id.toString(),
        title: d.title ?? '',
        type: postType,
        category: categoryLabel,
        region: d.region ?? d.board_region ?? '',
        structured_fields: d.structured_fields ?? {},
        content: d.content ?? '',
        score: d.score ?? d.likeCount ?? 0,
        likes: d.likeCount ?? d.score ?? 0,
        likeCount: d.likeCount ?? d.score ?? 0,
        comment_count: d.commentCount ?? 0,
        commentCount: d.commentCount ?? 0,
        report_count: d.reportCount ?? 0,
        reportCount: d.reportCount ?? 0,
        created_at: createdAt.toISOString(),
        author_nickname: d.authorName ?? d.anon_handle ?? '익명',
        authorName: d.authorName ?? d.anon_handle ?? '익명',
      };
    });

    const cursorValue = hasMore && results.length > 0
      ? results[results.length - 1]._id.toString()
      : null;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      posts,
      cursor: cursorValue,
      nextCursor: cursorValue,
      has_more: hasMore,
      hasMore,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  if (!FEATURE_FLAGS.communityWrite) {
    logRequest(req, 400, start, traceId);
    return NextResponse.json(
      { error: { code: 'feature_disabled', message: '커뮤니티 글쓰기는 아직 준비 중입니다' } },
      { status: 400 },
    );
  }

  try {
    const session = await auth();
    if (!session?.userId) {
      logRequest(req, 401, start, traceId);
      return errors.unauthorized('로그인이 필요합니다', 'auth_required');
    }

    const body = await parseJson(req);
    const parsedBody = communityPostSchema.safeParse(body);
    if (!parsedBody.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsedBody.error.flatten().formErrors.join(', '), 'validation_error');
    }

    const limit = await checkLimit(session.userId, 'community_write');
    if (!limit.allowed) {
      if (limit.upgradeNeeded) {
        logRequest(req, 403, start, traceId);
        return NextResponse.json(
          {
            error: '커뮤니티 글쓰기 한도를 초과했습니다',
            code: 'community_write_limit_exceeded',
            upgradeNeeded: true,
            remaining: limit.remaining,
          },
          { status: 403 },
        );
      }
      logRequest(req, 429, start, traceId);
      return errors.tooMany('커뮤니티 글쓰기 한도를 초과했습니다', 'community_write_limit_exceeded');
    }

    const title = applyContentLimits(sanitizePostField(parsedBody.data.title, '제목'), 100);
    const content = applyContentLimits(sanitizePostField(parsedBody.data.content, '내용'), 2000);
    const region = applyContentLimits(sanitizePostField(parsedBody.data.region, '지역'), 50);
    const category = parsedBody.data.category;
    const isAnonymous = parsedBody.data.anonymous;

    const db = await getDbOrThrow();
    const col = db.collection<PostDoc>(U.POSTS);
    const now = new Date();
    const authorName = isAnonymous ? '익명' : (session.user?.name ?? '익명');
    const doc: Omit<PostDoc, '_id'> = {
      title,
      content,
      category,
      region,
      authorId: session.userId,
      authorName,
      likeCount: 0,
      commentCount: 0,
      reportCount: 0,
      isHidden: false,
      createdAt: now,
      updatedAt: now,
      type: toLegacyType(category),
      board_region: region,
      status: 'published',
      created_at: now,
      updated_at: now,
      structured_fields: {},
      anon_id: session.userId,
      anon_handle: authorName,
      score: 0,
      likedBy: [],
    };

    const result = await col.insertOne(doc as unknown as PostDoc);
    await incrementFeatureUsage(session.userId, 'community_write');

    const postId = result.insertedId.toString();
    logRequest(req, 201, start, traceId);
    return NextResponse.json({
      id: postId,
      _id: postId,
      category,
      title,
    }, { status: 201 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
