import { NextRequest, NextResponse } from 'next/server';
import { getUserId, parseJson, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { recommendationInputSchema, parseBody } from '@/lib/server/validation';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { analyzeRoutes } from '@/lib/server/strategyEngine';
import { AppError } from '@/lib/server/errors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);

    // Rate limit: 10 recommendations per hour
    const rl = await checkRateLimit(`rec:${userId}`, 10, 60 * 60 * 1000);
    if (!rl.allowed) {
      throw new AppError('요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.', 429, 'rate_limited');
    }

    const body = await parseJson(req);
    const parsed = parseBody(recommendationInputSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const result = await analyzeRoutes(parsed.data, userId);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
