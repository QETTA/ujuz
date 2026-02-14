import { NextRequest, NextResponse } from 'next/server';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';

export const runtime = 'nodejs';

interface NotifSettings {
  enabled: boolean;
  to_alerts: boolean;
  announcements: boolean;
  consultation: boolean;
  quiet_start: string;
  quiet_end: string;
}

const DEFAULTS: NotifSettings = {
  enabled: true,
  to_alerts: true,
  announcements: true,
  consultation: true,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateSettings(body: unknown): NotifSettings {
  if (!body || typeof body !== 'object') return DEFAULTS;

  const raw = body as Record<string, unknown>;

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULTS.enabled,
    to_alerts: typeof raw.to_alerts === 'boolean' ? raw.to_alerts : DEFAULTS.to_alerts,
    announcements: typeof raw.announcements === 'boolean' ? raw.announcements : DEFAULTS.announcements,
    consultation: typeof raw.consultation === 'boolean' ? raw.consultation : DEFAULTS.consultation,
    quiet_start:
      typeof raw.quiet_start === 'string' && TIME_RE.test(raw.quiet_start)
        ? raw.quiet_start
        : DEFAULTS.quiet_start,
    quiet_end:
      typeof raw.quiet_end === 'string' && TIME_RE.test(raw.quiet_end)
        ? raw.quiet_end
        : DEFAULTS.quiet_end,
  };
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    const doc = await db.collection(U.NOTIFICATION_SETTINGS).findOne({ user_id: userId });

    const settings: NotifSettings = doc
      ? {
          enabled: doc.enabled ?? DEFAULTS.enabled,
          to_alerts: doc.to_alerts ?? DEFAULTS.to_alerts,
          announcements: doc.announcements ?? DEFAULTS.announcements,
          consultation: doc.consultation ?? DEFAULTS.consultation,
          quiet_start: doc.quiet_start ?? DEFAULTS.quiet_start,
          quiet_end: doc.quiet_end ?? DEFAULTS.quiet_end,
        }
      : DEFAULTS;

    logRequest(req, 200, start, traceId);
    return NextResponse.json(settings);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}

export async function PUT(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const body = await req.json().catch(() => ({}));
    const settings = validateSettings(body);

    const db = await getDbOrThrow();

    await db.collection(U.NOTIFICATION_SETTINGS).updateOne(
      { user_id: userId },
      {
        $set: {
          ...settings,
          user_id: userId,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true },
    );

    logRequest(req, 200, start, traceId);
    return NextResponse.json(settings);
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
