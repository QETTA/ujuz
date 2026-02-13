import { NextRequest, NextResponse } from 'next/server';
import { getConversation, deleteConversation } from '@/lib/server/botService';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { conversationIdSchema } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const { id } = await params;
    const userId = await getUserId(req);

    const parsed = conversationIdSchema.safeParse(id);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 대화 ID입니다', 'invalid_conversation_id');
    }

    const conversation = await getConversation(parsed.data);
    if (!conversation) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('대화를 찾을 수 없습니다', 'conversation_not_found');
    }

    if (conversation.user_id !== userId) {
      logRequest(req, 404, start, traceId);
      return errors.notFound('대화를 찾을 수 없습니다', 'conversation_not_found');
    }

    const { user_id: _, ...safeConversation } = conversation;
    logRequest(req, 200, start, traceId);
    return NextResponse.json(safeConversation);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);
  try {
    const { id } = await params;
    const userId = await getUserId(req);

    const parsed = conversationIdSchema.safeParse(id);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('유효하지 않은 대화 ID입니다', 'invalid_conversation_id');
    }

    await deleteConversation(parsed.data, userId);
    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
