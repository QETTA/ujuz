import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDbOrThrow as getDb } from '@/lib/server/db';
import { auth } from '@/lib/server/auth';
import { AppError } from '@/lib/server/errors';

export const runtime = 'nodejs';

const HHMM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

type ScheduleMode = 'immediate' | 'daily';

interface QuietHours {
  from: string;
  to: string;
}

interface AlertSchedule {
  mode: ScheduleMode;
  quiet_hours?: QuietHours;
}

interface AlertChannels {
  push: boolean;
  sms?: boolean;
}

interface AlertSubscriptionDoc {
  _id: ObjectId;
  user_id: string;
  facility_id: string;
  schedule: AlertSchedule;
  channels: AlertChannels;
  created_at: Date;
  updated_at: Date;
}

function appError(message: string, code: string) {
  return new AppError(message, 400, code);
}

function parseQuietHours(value: unknown): QuietHours | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object') {
    throw appError('quiet_hours 형식이 올바르지 않습니다', 'validation_error');
  }

  const from = (value as { from?: unknown }).from;
  const to = (value as { to?: unknown }).to;

  if (typeof from !== 'string' || !HHMM_RE.test(from)) {
    throw appError('quiet_hours.from 형식이 올바르지 않습니다', 'validation_error');
  }
  if (typeof to !== 'string' || !HHMM_RE.test(to)) {
    throw appError('quiet_hours.to 형식이 올바르지 않습니다', 'validation_error');
  }

  return { from, to };
}

function parseSchedule(value: unknown): AlertSchedule {
  if (typeof value === 'string') {
    if (value === 'immediate' || value === 'daily') {
      return { mode: value };
    }
    throw appError('schedule 값이 올바르지 않습니다', 'validation_error');
  }

  if (!value || typeof value !== 'object') {
    throw appError('schedule 형식이 올바르지 않습니다', 'validation_error');
  }

  const mode = (value as { mode?: unknown }).mode;
  if (mode !== 'immediate' && mode !== 'daily') {
    throw appError('schedule.mode 값이 올바르지 않습니다', 'validation_error');
  }

  const quietHours = parseQuietHours((value as { quiet_hours?: unknown }).quiet_hours);
  return quietHours ? { mode, quiet_hours: quietHours } : { mode };
}

function parseChannels(value: unknown): AlertChannels {
  if (!value || typeof value !== 'object') {
    throw appError('channels 형식이 올바르지 않습니다', 'validation_error');
  }

  const push = (value as { push?: unknown }).push;
  const sms = (value as { sms?: unknown }).sms;

  if (typeof push !== 'boolean') {
    throw appError('channels.push 값이 올바르지 않습니다', 'validation_error');
  }
  if (sms !== undefined && typeof sms !== 'boolean') {
    throw appError('channels.sms 값이 올바르지 않습니다', 'validation_error');
  }

  return { push, sms: typeof sms === 'boolean' ? sms : false };
}

function parseCreateBody(body: unknown): {
  facility_id: string;
  schedule: AlertSchedule;
  channels: AlertChannels;
} {
  if (!body || typeof body !== 'object') {
    throw appError('요청 본문 형식이 올바르지 않습니다', 'invalid_json');
  }

  const facilityIdRaw = (body as { facility_id?: unknown }).facility_id;
  const facilityId = typeof facilityIdRaw === 'string' ? facilityIdRaw.trim() : '';
  if (!facilityId) {
    throw appError('facility_id가 필요합니다', 'validation_error');
  }

  return {
    facility_id: facilityId,
    schedule: parseSchedule((body as { schedule?: unknown }).schedule),
    channels: parseChannels((body as { channels?: unknown }).channels),
  };
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: (error.code ?? 'APP_ERROR').toUpperCase(),
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: 'SERVER_ERROR',
        message: '일시적인 오류가 발생했어요.',
      },
    },
    { status: 500 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      throw new AppError('로그인이 필요합니다', 401, 'auth_required');
    }

    const body = await req.json().catch(() => {
      throw new AppError('잘못된 요청 형식입니다', 400, 'invalid_json');
    });
    const parsed = parseCreateBody(body);

    const db = await getDb();
    const collection = db.collection<AlertSubscriptionDoc>('alert_subscriptions');
    const now = new Date();

    const existing = await collection.findOne({
      user_id: session.userId,
      facility_id: parsed.facility_id,
    });

    if (existing) {
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            schedule: parsed.schedule,
            channels: parsed.channels,
            updated_at: now,
          },
        },
      );

      return NextResponse.json({ subscription_id: existing._id.toString() }, { status: 201 });
    }

    const result = await collection.insertOne({
      _id: new ObjectId(),
      user_id: session.userId,
      facility_id: parsed.facility_id,
      schedule: parsed.schedule,
      channels: parsed.channels,
      created_at: now,
      updated_at: now,
    });

    return NextResponse.json({ subscription_id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      throw new AppError('로그인이 필요합니다', 401, 'auth_required');
    }

    const db = await getDb();
    const docs = await db
      .collection<AlertSubscriptionDoc>('alert_subscriptions')
      .find({ user_id: session.userId })
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({
      subscriptions: docs.map((doc) => ({
        id: doc._id.toString(),
        facility_id: doc.facility_id,
        schedule: doc.schedule,
        channels: doc.channels,
        created_at: doc.created_at.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
