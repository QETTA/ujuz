import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { U } from '@/lib/server/collections';
import { getDbOrThrow } from '@/lib/server/db';
import { AppError } from '@/lib/server/errors';
import { errorResponse, getTraceId, getUserId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { logger } from '@/lib/server/logger';
import { sendSms } from '@/lib/server/smsService';
import { appendEvent } from '@/lib/server/userMemoryService';

export const runtime = 'nodejs';

const DEFAULT_SMS_DAILY_CAP = toPositiveInt(process.env.SMS_DAILY_CAP, 5);
const DEFAULT_SMS_MONTHLY_CAP = toPositiveInt(process.env.SMS_MONTHLY_CAP, 50);
const SMS_MAX_BYTES = 90;

const smsSendSchema = z.object({
  user_id: z.string().trim().min(1),
  message: z.string().trim().min(1).max(1000),
});

type SmsSettingDoc = {
  user_id: string;
  enabled?: boolean;
  phone?: string | null;
  daily_cap?: number;
  monthly_cap?: number;
  consented_at?: Date;
};

type SmsLogStatus = 'sent' | 'failed' | 'blocked';

type SmsLogDoc = {
  user_id: string;
  phone: string | null;
  message: string;
  status: SmsLogStatus;
  reason?: string;
  daily_sent?: number;
  daily_cap?: number;
  monthly_sent?: number;
  monthly_cap?: number;
  created_at: Date;
};

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) {
    return value;
  }

  let result = '';
  for (const ch of value) {
    if (Buffer.byteLength(result + ch, 'utf8') > maxBytes) {
      break;
    }
    result += ch;
  }
  return result;
}

function getKstDayStart(now: Date): Date {
  const utc = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const startUtcMs = Date.UTC(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    0,
    0,
    0,
    0,
  ) - 9 * 60 * 60 * 1000;
  return new Date(startUtcMs);
}

function getKstMonthStart(now: Date): Date {
  const utc = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const startUtcMs = Date.UTC(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    1,
    0,
    0,
    0,
    0,
  ) - 9 * 60 * 60 * 1000;
  return new Date(startUtcMs);
}

async function safeAppendEvent(params: {
  userId: string;
  type: string;
  data: Record<string, unknown>;
}) {
  try {
    await appendEvent(params);
  } catch (error) {
    logger.warn('sms_analytics_append_failed', {
      type: params.type,
      userId: params.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function writeSmsLog(db: Awaited<ReturnType<typeof getDbOrThrow>>, doc: SmsLogDoc) {
  await db.collection<SmsLogDoc>(U.SMS_LOGS).insertOne(doc);
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const requesterUserId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = smsSendSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.message, 400, 'validation_error');
    }

    if (parsed.data.user_id !== requesterUserId) {
      throw new AppError('다른 사용자로 SMS 발송은 허용되지 않습니다', 403, 'forbidden_sms_user');
    }

    const db = await getDbOrThrow();
    const settings = await db.collection<SmsSettingDoc>(U.SMS_SETTINGS).findOne({
      user_id: parsed.data.user_id,
    });

    const message = truncateUtf8(parsed.data.message, SMS_MAX_BYTES);
    const now = new Date();

    if (!settings?.enabled) {
      await writeSmsLog(db, {
        user_id: parsed.data.user_id,
        phone: settings?.phone ?? null,
        message,
        status: 'blocked',
        reason: 'opt_in_required',
        created_at: now,
      });
      await safeAppendEvent({
        userId: parsed.data.user_id,
        type: 'sms_blocked',
        data: { reason: 'opt_in_required' },
      });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({ status: 'blocked', reason: 'opt_in_required' });
    }

    if (!settings.phone) {
      await writeSmsLog(db, {
        user_id: parsed.data.user_id,
        phone: null,
        message,
        status: 'blocked',
        reason: 'missing_phone',
        created_at: now,
      });
      await safeAppendEvent({
        userId: parsed.data.user_id,
        type: 'sms_blocked',
        data: { reason: 'missing_phone' },
      });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({ status: 'blocked', reason: 'missing_phone' });
    }

    if (!settings.consented_at) {
      await writeSmsLog(db, {
        user_id: parsed.data.user_id,
        phone: settings.phone,
        message,
        status: 'blocked',
        reason: 'consent_required',
        created_at: now,
      });
      await safeAppendEvent({
        userId: parsed.data.user_id,
        type: 'sms_blocked',
        data: { reason: 'consent_required' },
      });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({ status: 'blocked', reason: 'consent_required' });
    }

    const dailyCap = settings.daily_cap ?? DEFAULT_SMS_DAILY_CAP;
    const monthlyCap = settings.monthly_cap ?? DEFAULT_SMS_MONTHLY_CAP;
    const dayStart = getKstDayStart(now);
    const monthStart = getKstMonthStart(now);

    const [dailySent, monthlySent] = await Promise.all([
      db.collection(U.SMS_LOGS).countDocuments({
        user_id: parsed.data.user_id,
        status: 'sent',
        created_at: { $gte: dayStart },
      }),
      db.collection(U.SMS_LOGS).countDocuments({
        user_id: parsed.data.user_id,
        status: 'sent',
        created_at: { $gte: monthStart },
      }),
    ]);

    if (dailySent >= dailyCap || monthlySent >= monthlyCap) {
      const reason = dailySent >= dailyCap ? 'daily_cap' : 'monthly_cap';

      await writeSmsLog(db, {
        user_id: parsed.data.user_id,
        phone: settings.phone,
        message,
        status: 'blocked',
        reason,
        daily_sent: dailySent,
        daily_cap: dailyCap,
        monthly_sent: monthlySent,
        monthly_cap: monthlyCap,
        created_at: now,
      });
      await safeAppendEvent({
        userId: parsed.data.user_id,
        type: 'sms_blocked',
        data: { reason },
      });

      logger.warn('sms_blocked', {
        traceId,
        userId: parsed.data.user_id,
        reason,
        dailySent,
        dailyCap,
        monthlySent,
        monthlyCap,
      });

      logRequest(req, 200, start, traceId);
      return NextResponse.json({ status: 'blocked', reason });
    }

    const sent = await sendSms(db, settings.phone, message, parsed.data.user_id);
    await writeSmsLog(db, {
      user_id: parsed.data.user_id,
      phone: settings.phone,
      message,
      status: sent ? 'sent' : 'failed',
      reason: sent ? undefined : 'send_failed',
      daily_sent: dailySent + (sent ? 1 : 0),
      daily_cap: dailyCap,
      monthly_sent: monthlySent + (sent ? 1 : 0),
      monthly_cap: monthlyCap,
      created_at: now,
    });

    await safeAppendEvent({
      userId: parsed.data.user_id,
      type: 'sms_send',
      data: {
        status: sent ? 'sent' : 'failed',
        message_bytes: Buffer.byteLength(message, 'utf8'),
      },
    });

    logger.info('sms_send', {
      traceId,
      userId: parsed.data.user_id,
      status: sent ? 'sent' : 'failed',
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      status: sent ? 'sent' : 'failed',
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
