import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { U } from '@/lib/server/collections';

export const runtime = 'nodejs';

/**
 * DELETE /api/user/account
 * Deletes/anonymizes all user data across 10 collections.
 */
export async function DELETE(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    await Promise.all([
      // Hard delete — user-private data
      db.collection(U.USER_MEMORIES).deleteMany({ userId }),
      db.collection(U.USER_EVENTS).deleteMany({ userId }),
      db.collection(U.CONVERSATIONS).deleteMany({ user_id: userId }),
      db.collection(U.TO_SUBSCRIPTIONS).deleteMany({ user_id: userId }),
      db.collection(U.TO_ALERTS).deleteMany({ user_id: userId }),
      db.collection(U.USER_SUBSCRIPTIONS).deleteMany({ user_id: userId }),
      db.collection(U.RECOMMENDATIONS).deleteMany({ user_id: userId }),
      db.collection(U.CHECKLISTS).deleteMany({ user_id: userId }),
      db.collection(U.USAGE_COUNTERS).deleteMany({ subject_id: userId }),

      // Anonymize community posts (keep content for community value)
      db.collection(U.POSTS).updateMany(
        { anon_id: userId },
        { $set: { anon_id: 'deleted', anon_handle: '탈퇴한 사용자' } },
      ),
    ]);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
