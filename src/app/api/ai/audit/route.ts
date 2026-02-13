/**
 * GET /api/ai/audit — AI usage audit log for the current user
 * Returns recent AI interactions (conversation count, total messages, cost summary).
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    const [conversationCount, todayUsage] = await Promise.all([
      db.collection(U.CONVERSATIONS).countDocuments({ user_id: userId }),
      db.collection(U.USAGE_COUNTERS).findOne({
        subject_id: userId,
        feature: 'bot_query',
        period: new Date().toISOString().slice(0, 10),
      }),
    ]);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      conversations_total: conversationCount,
      queries_today: todayUsage?.count ?? 0,
      last_query_at: todayUsage?.updated_at?.toISOString?.() ?? null,
    });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
