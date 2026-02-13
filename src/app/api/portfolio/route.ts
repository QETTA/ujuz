/**
 * POST /api/portfolio — Analyze admission routes (strategy engine wrapper)
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { parseBody, recommendationInputSchema } from '@/lib/server/validation';
import { analyzeRoutes } from '@/lib/server/strategyEngine';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(recommendationInputSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await analyzeRoutes(parsed.data, userId);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
