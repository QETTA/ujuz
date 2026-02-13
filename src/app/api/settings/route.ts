/**
 * GET /api/settings — Get user settings
 * PATCH /api/settings — Update user settings
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, parseJson, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { parseBody, settingsSchema } from '@/lib/server/validation';

const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  notifications: { push: true, email: false, sms: false },
  language: 'ko' as const,
};

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    const doc = await db.collection(U.USER_MEMORIES).findOne({
      userId,
      memoryKey: 'user_settings',
      isActive: true,
    });

    const settings = doc?.value
      ? { ...DEFAULT_SETTINGS, ...(() => { try { return JSON.parse(doc.value); } catch { return {}; } })() }
      : DEFAULT_SETTINGS;

    logRequest(req, 200, start, traceId);
    return NextResponse.json(settings);
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}

export async function PATCH(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = parseBody(settingsSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const db = await getDbOrThrow();

    // Get existing settings
    const existing = await db.collection(U.USER_MEMORIES).findOne({
      userId,
      memoryKey: 'user_settings',
      isActive: true,
    });

    const currentSettings = existing?.value
      ? (() => { try { return JSON.parse(existing.value); } catch { return {}; } })()
      : {};
    const merged = { ...DEFAULT_SETTINGS, ...currentSettings, ...parsed.data };

    const now = new Date();
    await db.collection(U.USER_MEMORIES).updateOne(
      { userId, memoryKey: 'user_settings' },
      {
        $set: {
          value: JSON.stringify(merged),
          tags: ['settings'],
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json(merged);
  } catch (error) {
    logRequest(req, 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
