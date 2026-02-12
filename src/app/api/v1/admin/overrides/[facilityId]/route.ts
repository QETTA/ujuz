import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { facilityOverrideSchema, parseBody } from '@/lib/server/validation';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { applyOverride } from '@/lib/server/facility/facilityService';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    if (!FEATURE_FLAGS.facilityAdminApi) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json(
        { error: 'Facility admin API is not enabled', code: 'feature_disabled' },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = parseBody(facilityOverrideSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { facilityId } = await params;
    const { field_path, new_value, reason } = parsed.data;

    const db = await getDbOrThrow();
    await applyOverride(db, facilityId, field_path, new_value, reason, 'admin');

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
