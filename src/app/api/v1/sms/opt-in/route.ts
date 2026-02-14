import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { U } from '@/lib/server/collections';
import { getDbOrThrow } from '@/lib/server/db';
import { AppError } from '@/lib/server/errors';
import { errorResponse, getTraceId, getUserId, logRequest, parseJson } from '@/lib/server/apiHelpers';
import { logger } from '@/lib/server/logger';
import { appendEvent } from '@/lib/server/userMemoryService';

export const runtime = 'nodejs';

const DEFAULT_SMS_DAILY_CAP = toPositiveInt(process.env.SMS_DAILY_CAP, 5);
const DEFAULT_SMS_MONTHLY_CAP = toPositiveInt(process.env.SMS_MONTHLY_CAP, 50);

const smsOptInSchema = z.object({
  enabled: z.boolean(),
  phone: z.string().trim().optional(),
});

type SmsSettingDoc = {
  user_id: string;
  enabled?: boolean;
  phone?: string | null;
  daily_cap?: number;
  monthly_cap?: number;
  consented_at?: Date;
  created_at?: Date;
  updated_at?: Date;
};

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const normalized = digits.startsWith('82') ? `0${digits.slice(2)}` : digits;
  if (!/^01[016789]\d{7,8}$/.test(normalized)) {
    throw new AppError('전화번호 형식이 올바르지 않습니다', 400, 'invalid_phone');
  }
  return normalized;
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

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await parseJson(req);
    const parsed = smsOptInSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.message, 400, 'validation_error');
    }

    const db = await getDbOrThrow();
    const settings = await db.collection<SmsSettingDoc>(U.SMS_SETTINGS).findOne({ user_id: userId });

    let normalizedPhone: string | null = settings?.phone ?? null;
    if (parsed.data.enabled) {
      if (!parsed.data.phone) {
        throw new AppError('SMS 옵션 활성화 시 phone은 필수입니다', 400, 'missing_phone');
      }
      normalizedPhone = normalizePhone(parsed.data.phone);
    } else if (parsed.data.phone) {
      normalizedPhone = normalizePhone(parsed.data.phone);
    }

    const now = new Date();
    const dailyCap = settings?.daily_cap ?? DEFAULT_SMS_DAILY_CAP;
    const monthlyCap = settings?.monthly_cap ?? DEFAULT_SMS_MONTHLY_CAP;

    await db.collection<SmsSettingDoc>(U.SMS_SETTINGS).updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          enabled: parsed.data.enabled,
          phone: normalizedPhone,
          daily_cap: dailyCap,
          monthly_cap: monthlyCap,
          updated_at: now,
          ...(parsed.data.enabled ? { consented_at: now } : {}),
        },
        $setOnInsert: { created_at: now },
      },
      { upsert: true },
    );

    await safeAppendEvent({
      userId,
      type: 'sms_opt_in',
      data: {
        enabled: parsed.data.enabled,
        has_phone: Boolean(normalizedPhone),
        phone_last4: normalizedPhone ? normalizedPhone.slice(-4) : '',
      },
    });

    logger.info('sms_opt_in', {
      traceId,
      userId,
      enabled: parsed.data.enabled,
    });

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      status: parsed.data.enabled ? 'enabled' : 'disabled',
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
