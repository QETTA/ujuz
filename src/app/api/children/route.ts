/**
 * GET /api/children — List child profiles from user_memories
 * POST /api/children — Create a new child profile
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { parseBody, childCreateSchema } from '@/lib/server/validation';
import { ObjectId } from 'mongodb';

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

    const mapped = children.map((c) => ({
      id: c._id.toString(),
      nickname: c.value ? JSON.parse(c.value).nickname : c.memoryKey,
      ...(() => { try { return JSON.parse(c.value); } catch { return {}; } })(),
      created_at: c.createdAt?.toISOString?.() ?? null,
    }));

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
    const parsed = parseBody(childCreateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = await getDbOrThrow();
    const now = new Date();
    const childId = new ObjectId();

    await db.collection(U.USER_MEMORIES).insertOne({
      _id: childId,
      userId,
      memoryKey: `child_${parsed.data.nickname}`,
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
