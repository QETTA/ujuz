import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { facilityIngestSchema, parseBody } from '@/lib/server/validation';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { fetchFacilityPage } from '@/lib/server/facility/connector';
import { ingestBatch } from '@/lib/server/facility/ingestService';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
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

    const parsed = parseBody(facilityIngestSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const { page, page_size } = parsed.data;
    const { items, totalCount } = await fetchFacilityPage(page, page_size);

    const db = await getDbOrThrow();
    const result = await ingestBatch(db, items);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      ...result,
      total_available: totalCount,
      page,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
