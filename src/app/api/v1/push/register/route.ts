import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/server/db';

export const runtime = 'nodejs';

const EXPO_PUSH_TOKEN_RE = /^ExponentPushToken\[.+\]$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, platform, deviceName } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Missing push token', code: 'missing_token' },
        { status: 400 },
      );
    }

    if (!EXPO_PUSH_TOKEN_RE.test(token)) {
      return NextResponse.json(
        { error: 'Invalid push token format', code: 'invalid_token' },
        { status: 400 },
      );
    }

    const deviceId = req.headers.get('x-device-id');
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing device ID', code: 'missing_device_id' },
        { status: 400 },
      );
    }

    const db = await connectDb();
    const collection = db.collection('push_tokens');

    await collection.updateOne(
      { device_id: deviceId },
      {
        $set: {
          token,
          platform: platform ?? 'unknown',
          device_name: deviceName ?? 'unknown',
          updated_at: new Date(),
        },
        $setOnInsert: {
          device_id: deviceId,
          created_at: new Date(),
          is_active: true,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Push registration error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'internal_error' },
      { status: 500 },
    );
  }
}
