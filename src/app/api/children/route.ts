/**
 * GET /api/children — List child profiles from user_memories
 * POST /api/children — Create a new child profile
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

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

const childCreateBodySchema = z.object({
  name: z.string().min(1).max(50),
  birthDate: z.string().refine(isValidIsoDate, {
    message: 'birthDate must be a valid ISO date (YYYY-MM-DD)',
  }),
  ageBand: z.number().int().min(0).max(5),
});

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    const children = await db.collection(U.USER_MEMORIES).find({
      userId,
      isActive: true,
      tags: 'child_profile',
    }).sort({ createdAt: -1 }).toArray();

    const mapped = children.map((c) => {
      const parsedValue = (() => { try { return JSON.parse(c.value); } catch { return {}; } })();
      return {
        id: c._id.toString(),
        nickname: parsedValue.name ?? parsedValue.nickname ?? c.memoryKey,
        ...parsedValue,
        created_at: c.createdAt?.toISOString?.() ?? null,
      };
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({ children: mapped });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = childCreateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: parsed.error.message },
        { status: 400 },
      );
    }

    const db = await getDbOrThrow();
    const now = new Date();
    const childId = new ObjectId();

    await db.collection(U.USER_MEMORIES).insertOne({
      _id: childId,
      userId,
      memoryKey: `child_${parsed.data.name}`,
      value: JSON.stringify(parsed.data),
      tags: ['child_profile'],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    logRequest(req, 201, start, traceId);
    return NextResponse.json({
      id: childId.toString(),
      ...parsed.data,
      created_at: now.toISOString(),
    }, { status: 201 });
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
