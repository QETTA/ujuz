import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/server/errors';
import { getUserId, errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';

export const runtime = 'nodejs';

type ExportFormat = 'json' | 'csv';

type StringRecord = Record<string, unknown>;

function parseFormat(value: string | null): ExportFormat {
  if (value === null || value === 'json') return 'json';
  if (value === 'csv') return 'csv';

  throw new AppError('Invalid format. Allowed values are json or csv', 400, 'invalid_format');
}

function csvEscape(value: string): string {
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');

  return needsQuotes ? `"${escaped}"` : escaped;
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return csvEscape(value.toISOString());
  if (typeof value === 'string') return csvEscape(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    return csvEscape(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function csvHeaders(rows: StringRecord[]): string[] {
  const keys = new Set<string>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => {
      keys.add(key);
    });
  }

  return [...keys];
}

function buildSectionCsv(title: string, rows: StringRecord[]): string {
  const lines: string[] = [`# ${title}`];
  const headers = csvHeaders(rows);

  if (headers.length === 0) {
    lines.push('');
    return lines.join('\r\n');
  }

  lines.push(headers.map(csvEscape).join(','));

  for (const row of rows) {
    const rowValues = headers.map((header) => csvValue(row[header]));
    lines.push(rowValues.join(','));
  }

  return lines.join('\r\n');
}

function normalizeForCsv(documents: unknown[]): StringRecord[] {
  return documents
    .filter((item): item is StringRecord => item !== null && typeof item === 'object')
    .map((item) => ({ ...item }));
}

function toCsvExport(payload: {
  exported_at: string;
  user_id: string;
  conversations: StringRecord[];
  recommendations: StringRecord[];
  to_subscriptions: StringRecord[];
  to_alerts: StringRecord[];
  subscription: StringRecord | null;
  memories: StringRecord[];
}): string {
  const sections: Array<{ title: string; rows: StringRecord[] }> = [
    {
      title: 'metadata',
      rows: [
        {
          exported_at: payload.exported_at,
          user_id: payload.user_id,
        },
      ],
    },
    { title: 'conversations', rows: payload.conversations },
    { title: 'recommendations', rows: payload.recommendations },
    { title: 'to_subscriptions', rows: payload.to_subscriptions },
    { title: 'to_alerts', rows: payload.to_alerts },
    { title: 'subscription', rows: payload.subscription ? [payload.subscription] : [] },
    { title: 'memories', rows: payload.memories },
  ];

  return sections
    .map(({ title, rows }) => buildSectionCsv(title, rows))
    .join('\r\n\r\n');
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const format = parseFormat(new URL(req.url).searchParams.get('format'));
    const db = await getDbOrThrow();
    const exportedAt = new Date().toISOString();
    const fileDate = exportedAt.slice(0, 10);

    const userIdFilter = { user_id: userId };
    const userIdFallbackFilter = { userId: userId };

    const [conversations, recommendations, toSubscriptions, toAlerts, subscription, memories] = await Promise.all([
      db.collection(U.CONVERSATIONS).find(userIdFilter).sort({ created_at: -1 }).limit(100).toArray(),
      db.collection(U.RECOMMENDATIONS).find(userIdFilter).toArray(),
      db.collection(U.TO_SUBSCRIPTIONS).find(userIdFilter).toArray(),
      db.collection(U.TO_ALERTS).find(userIdFilter).sort({ detected_at: -1 }).limit(200).toArray(),
      db.collection(U.USER_SUBSCRIPTIONS).findOne(
        {
          ...userIdFilter,
          status: { $in: ['active', 'trial'] },
        },
        { sort: { current_period_end: -1 } },
      ),
      db.collection(U.USER_MEMORIES).find({ $or: [userIdFilter, userIdFallbackFilter] }).toArray(),
    ]);

    const payload = {
      exported_at: exportedAt,
      user_id: userId,
      conversations: normalizeForCsv(conversations),
      recommendations: normalizeForCsv(recommendations),
      to_subscriptions: normalizeForCsv(toSubscriptions),
      to_alerts: normalizeForCsv(toAlerts),
      subscription: subscription && typeof subscription === 'object' ? { ...(subscription as Record<string, unknown>) } : null,
      memories: normalizeForCsv(memories),
    };

    const filename = `ujuz-export-${fileDate}.${format}`;
    const headers = {
      'Content-Disposition': `attachment; filename="${filename}"`,
    };

    if (format === 'json') {
      logRequest(req, 200, start, traceId);
      return NextResponse.json(payload, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
    }

    const csvBody = toCsvExport(payload);

    logRequest(req, 200, start, traceId);
    return new NextResponse(csvBody, {
      headers: {
        ...headers,
        'Content-Type': 'text/csv',
      },
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
