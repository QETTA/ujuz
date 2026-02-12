import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';
import { reportSchema, parseBody } from '@/lib/server/validation';
import type { ReportDoc } from '@/lib/server/dbTypes';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  if (!FEATURE_FLAGS.communityReport) {
    logRequest(req, 400, start, traceId);
    return NextResponse.json(
      { error: '신고 기능이 비활성화되어 있습니다', code: 'feature_disabled' },
      { status: 400 },
    );
  }

  try {
    const { id: postId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = parseBody(reportSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data = parsed.data;
    const reporterAnonId = req.headers.get('x-anon-id') || req.headers.get('x-device-id') || 'anonymous';

    const db = await getDbOrThrow();
    const doc: Omit<ReportDoc, '_id'> = {
      post_id: postId,
      reporter_anon_id: reporterAnonId,
      reason: data.reason,
      detail: data.detail,
      action: 'pending',
      created_at: new Date(),
    };

    await db.collection(U.REPORTS).insertOne(doc);

    logRequest(req, 201, start, traceId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
