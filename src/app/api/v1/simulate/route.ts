/**
 * POST /api/v1/simulate — Run admission probability simulation via IPredictionEngine
 * Usage gating: checks subscription tier limits before scoring.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { getPredictionEngine } from '@/lib/server/interfaces/engineFactory';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { parseBody } from '@/lib/server/validation';
import { simulateSchema } from '@/lib/server/validation';
import { AppError } from '@/lib/server/errors';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(simulateSchema, body);
    if (!parsed.success) {
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const { facility_id, child_age_band, waiting_position, priority_type } = parsed.data;

    // Usage gating: check admission score limit
    const db = await getDbOrThrow();
    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.collection(U.USAGE_COUNTERS).findOne({
      subject_id: userId,
      feature: 'admission_score',
      period: today,
    });

    // Get user subscription tier
    const sub = await db.collection(U.USER_SUBSCRIPTIONS).findOne(
      { user_id: userId, status: 'active' },
      { sort: { created_at: -1 } },
    );
    const tier = sub?.plan_tier ?? 'free';
    const limits: Record<string, number> = { free: 3, basic: 15, premium: 999 };
    const limit = limits[tier] ?? 3;

    if ((usage?.count ?? 0) >= limit) {
      throw new AppError(
        `일일 시뮬레이션 한도(${limit}회)를 초과했습니다. 플랜을 업그레이드해 주세요.`,
        429,
        'usage_limit_exceeded',
      );
    }

    // Run prediction
    const engine = getPredictionEngine();
    const result = await engine.predict({
      facility_id,
      child_age_band,
      waiting_position,
      priority_type,
    });

    // Increment usage counter
    await db.collection(U.USAGE_COUNTERS).updateOne(
      { subject_id: userId, feature: 'admission_score', period: today },
      { $inc: { count: 1 }, $set: { updated_at: new Date() } },
      { upsert: true },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      result,
      usage: { used: (usage?.count ?? 0) + 1, limit },
    });
  } catch (error) {
    logRequest(req, error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
