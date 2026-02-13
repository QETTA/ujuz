import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { errorResponse, getTraceId, getUserId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { U } from '@/lib/server/collections';
import type { SavedFacilityDoc } from '@/lib/server/dbTypes';
import { objectIdSchema } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const { id } = await params;

    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid facility ID', 'invalid_facility_id');
    }

    const db = await getDbOrThrow();
    const now = new Date();

    await db.collection<SavedFacilityDoc>(U.SAVED_FACILITIES).updateOne(
      { user_id: userId, facility_id: id },
      {
        $set: { user_id: userId, facility_id: id, updated_at: now },
        $setOnInsert: { saved_at: now },
      },
      { upsert: true },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ saved: true });
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
    const userId = await getUserId(req);
    const { id } = await params;

    const idResult = objectIdSchema.safeParse(id);
    if (!idResult.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid facility ID', 'invalid_facility_id');
    }

    const db = await getDbOrThrow();
    await db.collection<SavedFacilityDoc>(U.SAVED_FACILITIES).deleteOne({ user_id: userId, facility_id: id });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ saved: false });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
