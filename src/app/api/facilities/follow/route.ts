/**
 * POST /api/facilities/follow — 관심시설 등록
 * DELETE /api/facilities/follow — 관심시설 해제
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { parseBody, facilityFollowSchema } from '@/lib/server/validation';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(facilityFollowSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = await getDbOrThrow();
    const now = new Date();

    await db.collection(U.USER_MEMORIES).updateOne(
      { userId, memoryKey: `follow_${parsed.data.facility_id}`, tags: 'followed_facility' },
      {
        $set: {
          value: JSON.stringify(parsed.data),
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ followed: true, facility_id: parsed.data.facility_id });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}

export async function DELETE(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const facilityId = req.nextUrl.searchParams.get('facility_id');
    if (!facilityId) {
      return NextResponse.json({ error: 'facility_id is required' }, { status: 400 });
    }

    const db = await getDbOrThrow();
    await db.collection(U.USER_MEMORIES).updateOne(
      { userId, memoryKey: `follow_${facilityId}`, tags: 'followed_facility' },
      { $set: { isActive: false, updatedAt: new Date() } },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ unfollowed: true, facility_id: facilityId });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
