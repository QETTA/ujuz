import { NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/lib/server/botService';
import { getUserId, errorResponse, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { checkRateLimit } from '@/lib/server/rateLimit';
import { chatMessageSchema, parseBody } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);

    const { allowed } = await checkRateLimit(`chat:${userId}`, 20, 60_000);
    if (!allowed) {
      logRequest(req, 429, start, traceId);
      return errors.tooMany('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
    }

    const body = await parseJson(req);
    const parsed = parseBody(chatMessageSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }
    const data = parsed.data;

    const result = await processQuery({
      user_id: userId,
      message: data.message,
      conversation_id: data.conversation_id ?? undefined,
      context: data.context,
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
