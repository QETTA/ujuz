import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { logger } from '@/lib/server/logger';
import { AppError } from '@/lib/server/errors';

export const runtime = 'nodejs';

const EXPO_PUSH_TOKEN_RE = /^ExponentPushToken\\[[A-Za-z0-9._-]+\\]$/;

interface PushRegisterBody {
  action?: string;
  token?: string;
  platform?: string;
  deviceName?: string;
}

type PushRegisterAction = 'register' | 'deregister';

function normalizePushRegisterAction(value?: string): PushRegisterAction | null {
  if (!value || value === 'register') {
    return 'register';
  }
  if (value === 'deregister' || value === 'unregister') {
    return 'deregister';
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as PushRegisterBody | null;
    const userAction = body?.action;
    const token = typeof body?.token === 'string' ? body.token : null;
    const platform = typeof body?.platform === 'string' ? body.platform : null;
    const deviceName = typeof body?.deviceName === 'string' ? body.deviceName : null;

    const action = normalizePushRegisterAction(userAction);
    if (!action) {
      return NextResponse.json(
        { error: { code: 'invalid_action', message: 'Invalid action' } },
        { status: 400 },
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: { code: 'missing_token', message: 'Missing push token' } },
        { status: 400 },
      );
    }

    if (!EXPO_PUSH_TOKEN_RE.test(token)) {
      return NextResponse.json(
        { error: { code: 'invalid_token', message: 'Invalid push token format' } },
        { status: 400 },
      );
    }

    const deviceId = req.headers.get('x-device-id');
    if (!deviceId) {
      return NextResponse.json(
        { error: { code: 'missing_device_id', message: 'Missing device ID' } },
        { status: 400 },
      );
    }

    const userId = await getUserId(req);
    const db = await getDbOrThrow();
    const now = new Date();
    const collection = db.collection(U.PUSH_TOKENS);

    if (action === 'deregister') {
      const result = await collection.updateMany(
        { user_id: userId, device_id: deviceId, token },
        {
          $set: {
            is_active: false,
            updated_at: now,
          },
        },
      );

      logger.info('Push token deregistered', {
        userId,
        deviceId,
        token,
        matchedCount: result.matchedCount,
      });

      return NextResponse.json({ ok: result.matchedCount > 0 });
    }

    await collection.updateOne(
      { user_id: userId, device_id: deviceId },
      {
        $set: {
          user_id: userId,
          device_id: deviceId,
          token,
          platform: platform ?? 'unknown',
          device_name: deviceName ?? 'unknown',
          is_active: true,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );

    logger.info('Push token registered', {
      userId,
      deviceId,
      token,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.statusCode;
      logger.warn('Push registration auth or validation error', {
        error: err.message,
        code: err.code,
      });

      return NextResponse.json(
        { error: { code: err.code ?? 'bad_request', message: err.message } },
        { status },
      );
    }

    logger.error('Push registration error', {
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      { status: 500 },
    );
  }
}
