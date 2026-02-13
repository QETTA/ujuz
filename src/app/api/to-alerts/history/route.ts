import { NextRequest, NextResponse } from 'next/server';
import { getAlertHistory } from '@/lib/server/toAlertService';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { objectIdSchema } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const { searchParams } = new URL(req.url);
    const cursorParam = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');

    if (cursorParam) {
      const cursorResult = objectIdSchema.safeParse(cursorParam);
      if (!cursorResult.success) {
        logRequest(req, 400, start, traceId);
        return errors.badRequest(
          cursorResult.error.issues[0]?.message ?? '유효하지 않은 ID입니다',
          'invalid_cursor',
        );
      }
    }

    let limit: number | undefined;
    if (limitParam != null) {
      const parsedLimit = Number(limitParam);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        logRequest(req, 400, start, traceId);
        return errors.badRequest(
          'limit must be an integer between 1 and 100',
          'invalid_limit',
        );
      }
      limit = parsedLimit;
    }

    const result = await getAlertHistory(userId, {
      cursor: cursorParam ?? undefined,
      limit,
    });
    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
