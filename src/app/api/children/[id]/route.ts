/**
 * PUT /api/children/:id — Update child profile
 * DELETE /api/children/:id — Delete child profile
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { parseBody, childUpdateSchema } from '@/lib/server/validation';
import { ObjectId } from 'mongodb';
import { AppError } from '@/lib/server/errors';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const { id } = await ctx.params;

    if (!ObjectId.isValid(id)) {
      throw new AppError('유효하지 않은 ID입니다', 400, 'invalid_id');
    }

    const body = await parseJson(req);
    const parsed = parseBody(childUpdateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = await getDbOrThrow();
    const existing = await db.collection(U.USER_MEMORIES).findOne({
      _id: new ObjectId(id),
      userId,
      tags: 'child_profile',
      isActive: true,
    });

    if (!existing) {
      throw new AppError('아이 정보를 찾을 수 없습니다', 404, 'child_not_found');
    }

    const currentData = (() => { try { return JSON.parse(existing.value); } catch { return {}; } })();
    const merged = { ...currentData, ...parsed.data };

    await db.collection(U.USER_MEMORIES).updateOne(
      { _id: new ObjectId(id) },
      { $set: { value: JSON.stringify(merged), updatedAt: new Date() } },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ id, ...merged });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const { id } = await ctx.params;

    if (!ObjectId.isValid(id)) {
      throw new AppError('유효하지 않은 ID입니다', 400, 'invalid_id');
    }

    const db = await getDbOrThrow();
    const result = await db.collection(U.USER_MEMORIES).updateOne(
      { _id: new ObjectId(id), userId, tags: 'child_profile' },
      { $set: { isActive: false, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      throw new AppError('아이 정보를 찾을 수 없습니다', 404, 'child_not_found');
    }

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
