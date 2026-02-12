import { NextRequest, NextResponse } from 'next/server';
import { getAlertHistory } from '@/lib/server/toAlertService';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const userId = await getUserId(req);
    const result = await getAlertHistory(userId);
    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
