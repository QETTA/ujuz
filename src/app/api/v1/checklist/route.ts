import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, parseJson, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getChecklist, toggleChecklistItem } from '@/lib/server/strategyEngine';
import { checklistPatchSchema, objectIdSchema, parseBody } from '@/lib/server/validation';

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
    const recommendationIdResult = objectIdSchema.safeParse(recommendationId);
    if (!recommendationIdResult.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json(
        { error: recommendationIdResult.error.issues[0]?.message ?? '유효하지 않은 ID입니다' },
        { status: 400 },
      );
    }

    const items = await getChecklist(recommendationIdResult.data, userId);

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

    const body = await parseJson(req);
    const parsed = parseBody(checklistPatchSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { recommendation_id, item_key, done } = parsed.data;
    await toggleChecklistItem(recommendation_id, userId, item_key, done);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
