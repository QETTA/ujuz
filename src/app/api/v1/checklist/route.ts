import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getChecklist, toggleChecklistItem } from '@/lib/server/strategyEngine';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);

    const { searchParams } = new URL(req.url);
    const recommendationId = searchParams.get('recommendation_id');
    if (!recommendationId) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json(
        { error: 'recommendation_id is required' },
        { status: 400 },
      );
    }

    const items = await getChecklist(recommendationId, userId);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ items });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function PATCH(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await req.json() as { recommendation_id?: string; item_key?: string; done?: boolean };

    if (!body.recommendation_id || !body.item_key || typeof body.done !== 'boolean') {
      logRequest(req, 400, start, traceId);
      return NextResponse.json(
        { error: 'recommendation_id, item_key, and done (boolean) are required' },
        { status: 400 },
      );
    }

    await toggleChecklistItem(body.recommendation_id, userId, body.item_key, body.done);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
