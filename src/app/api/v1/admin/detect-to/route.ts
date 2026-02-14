import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { detectToEvents } from '@/lib/server/toDetectionService';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    if (!FEATURE_FLAGS.toDetection) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json(
        { error: { code: 'feature_disabled', message: 'TO detection is not enabled' } },
        { status: 400 },
      );
    }

    const db = await getDbOrThrow();
    const result = await detectToEvents(db);

    logRequest(req, 200, start, traceId);
    return NextResponse.json(result);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
