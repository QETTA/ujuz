import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { AppError } from '@/lib/server/errors';

export const runtime = 'nodejs';

interface RecommendationDocument {
  recommendation_id: string;
  user_id: string;
  widget: {
    summary: {
      overall_grade: string;
      one_liner: string;
    };
    routes?: Array<unknown>;
  };
  created_at: Date;
}

interface RecommendationSummary {
  id: string;
  overall_grade: string;
  one_liner: string;
  routes_count: number;
  created_at: Date;
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);

    const { searchParams } = new URL(req.url);
    const rawLimit = searchParams.get('limit');
    const rawOffset = searchParams.get('offset');

    let limit = 10;
    let offset = 0;

    if (rawLimit !== null) {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
        throw new AppError('limit은 1~50 사이의 정수여야 합니다', 400, 'invalid_limit');
      }
      limit = parsed;
    }

    if (rawOffset !== null) {
      const parsed = Number(rawOffset);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new AppError('offset은 0 이상의 정수여야 합니다', 400, 'invalid_offset');
      }
      offset = parsed;
    }

    const db = await getDbOrThrow();

    const filter = { user_id: userId };

    const [total, docs] = await Promise.all([
      db.collection(U.RECOMMENDATIONS).countDocuments(filter),
      db
        .collection<RecommendationDocument>(U.RECOMMENDATIONS)
        .find(filter)
        .sort({ created_at: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
    ]);

    const items: RecommendationSummary[] = docs.map((doc) => ({
      id: doc.recommendation_id,
      overall_grade: doc.widget?.summary?.overall_grade ?? 'F',
      one_liner: doc.widget?.summary?.one_liner ?? '',
      routes_count: Array.isArray(doc.widget?.routes) ? doc.widget.routes.length : 0,
      created_at: doc.created_at,
    }));

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ items, total, limit, offset });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
