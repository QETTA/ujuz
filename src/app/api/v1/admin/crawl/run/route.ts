import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { runCrawl } from '@/lib/server/facility/crawlService';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    if (!FEATURE_FLAGS.facilityCrawl) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json(
        { error: { code: 'feature_disabled', message: 'Facility crawl is not enabled' } },
        { status: 400 },
      );
    }

    const db = await getDbOrThrow();
    const result = await runCrawl(db);

    const status = result.status === 'completed' ? 200 : 500;
    logRequest(req, status, start, traceId);
    return NextResponse.json(result, { status });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
