/**
 * PATCH /api/children/:id — Update child profile
 * DELETE /api/children/:id — Delete child profile
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { ObjectId } from 'mongodb';
import { AppError } from '@/lib/server/errors';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!isoDateRegex.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

const childIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'id must be a 24-character hex ObjectId',
});

const childPatchBodySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  birthDate: z.string().refine(isValidIsoDate, {
    message: 'birthDate must be a valid ISO date (YYYY-MM-DD)',
  }).optional(),
  ageBand: z.number().int().min(0).max(5).optional(),
});

async function updateChild(req: NextRequest, ctx: RouteContext) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const { id } = await ctx.params;
    const parsedId = childIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsedId.error.message },
        { status: 400 },
      );
    }

    const body = await parseJson(req);
    const parsed = childPatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsed.error.message },
        { status: 400 },
      );
    }

    const db = await getDbOrThrow();
    const existing = await db.collection(U.USER_MEMORIES).findOne({
      _id: new ObjectId(parsedId.data),
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
      { _id: new ObjectId(parsedId.data) },
      { $set: { value: JSON.stringify(merged), updatedAt: new Date() } },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ id, ...merged });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return updateChild(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return updateChild(req, ctx);
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
