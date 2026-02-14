import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { facilityOverrideSchema, objectIdSchema, parseBody } from '@/lib/server/validation';
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
        { error: { code: 'feature_disabled', message: 'Facility admin API is not enabled' } },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid JSON', 'invalid_json');
    }

    const parsed = parseBody(facilityOverrideSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const { facilityId } = await params;
    const facilityIdResult = objectIdSchema.safeParse(facilityId);
    if (!facilityIdResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(
        facilityIdResult.error.issues[0]?.message ?? '유효하지 않은 ID입니다',
        'invalid_facility_id',
      );
    }
    const { field_path, new_value, reason } = parsed.data;

    const db = await getDbOrThrow();
    await applyOverride(db, facilityIdResult.data, field_path, new_value, reason, 'admin');

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
