import { NextRequest, NextResponse } from 'next/server';
import type { Db } from 'mongodb';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { AppError } from '@/lib/server/errors';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { requireAdmin } from '@/lib/server/facility/adminAuth';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';

const RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
} as const;

type RangeKey = keyof typeof RANGE_DAYS;
type MetricUnit = 'krw' | 'percent' | 'count' | 'calls';

type AdminMetricCard = {
  id: string;
  title: string;
  value: number;
  value_unit: MetricUnit;
  secondary_value?: number;
  secondary_unit?: MetricUnit;
  description?: string;
};

type SlaOverdueItem = {
  order_id: string;
  status: string;
  user_id?: string;
  amount_krw?: number;
  started_at: string;
  due_at: string;
  elapsed_hours: number;
};

type PaymentTodayAgg = {
  payment_count: number;
  revenue_krw: number;
};

type PaymentRangeAgg = {
  total: number;
  failed: number;
  success: number;
};

type PushRangeAgg = {
  total: number;
  failed: number;
  sent: number;
};

type OverdueOrderAgg = {
  order_id?: string;
  status?: string;
  user_id?: string;
  amount_krw?: number;
  started_at?: Date;
  elapsed_ms?: number;
};

const SUCCESS_PAYMENT_STATUSES = ['confirmed', 'paid', 'success', 'done'] as const;
const FAILED_PAYMENT_STATUSES = ['failed', 'cancelled', 'canceled', 'aborted', 'expired', 'error'] as const;
const FAILED_PUSH_STATUSES = ['error', 'failed', 'fail'] as const;
const SENT_PUSH_STATUSES = ['sent', 'ok', 'delivered', 'success'] as const;
const ORDER_DONE_STATUSES = ['completed', 'delivered', 'ready', 'cancelled', 'canceled'] as const;
const PUSH_COLLECTION_CANDIDATES = [U.PUSH_LOGS, U.PUSH_DELIVERY_LOG] as const;

const SLA_HOURS = 48;
const MAP_CALLS_PER_ORDER = 24;
const MAP_CALLS_PER_PAYMENT_ATTEMPT = 8;
const MAP_CALLS_PER_PUSH_SENT = 1;
const SMS_COST_PER_SEND_KRW = 20;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS;

function parseRange(value: string | null): RangeKey {
  if (value === '7d' || value === '30d') {
    return value;
  }

  if (!value) {
    return '7d';
  }

  throw new AppError('range 파라미터는 7d 또는 30d만 허용됩니다.', 400, 'invalid_range');
}

function getKstTodayBounds(now: Date): { start: Date; end: Date } {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const startUtcMs = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
    0,
    0,
    0,
    0,
  ) - KST_OFFSET_MS;

  const start = new Date(startUtcMs);
  const end = new Date(startUtcMs + DAY_MS);
  return { start, end };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function toPercent(failed: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Number(((failed / denominator) * 100).toFixed(2));
}

function toSafeDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function toIso(date: Date): string {
  return date.toISOString();
}

async function resolvePushCollectionName(db: Db): Promise<string> {
  try {
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = new Set(collections.map((item) => item.name));

    for (const candidate of PUSH_COLLECTION_CANDIDATES) {
      if (names.has(candidate)) {
        return candidate;
      }
    }
  } catch (error) {
    logger.warn('admin_metrics_push_collection_discovery_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return U.PUSH_DELIVERY_LOG;
}

async function getTodayPaymentAgg(db: Db, start: Date, end: Date): Promise<PaymentTodayAgg> {
  const rows = await db.collection(U.PAYMENTS).aggregate<PaymentTodayAgg>([
    {
      $addFields: {
        _status: {
          $toLower: {
            $convert: { input: { $ifNull: ['$status', ''] }, to: 'string', onError: '', onNull: '' },
          },
        },
        _amount: {
          $convert: { input: { $ifNull: ['$amount', '$amount_krw'] }, to: 'double', onError: 0, onNull: 0 },
        },
        _event_at: {
          $convert: {
            input: { $ifNull: ['$confirmed_at', { $ifNull: ['$paid_at', '$created_at'] }] },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $match: {
        _event_at: { $gte: start, $lt: end },
        _status: { $in: [...SUCCESS_PAYMENT_STATUSES] },
      },
    },
    {
      $group: {
        _id: null,
        payment_count: { $sum: 1 },
        revenue_krw: { $sum: '$_amount' },
      },
    },
    { $project: { _id: 0, payment_count: 1, revenue_krw: 1 } },
  ]).toArray();

  const first = rows[0];
  return {
    payment_count: Math.max(0, Math.round(toNumber(first?.payment_count))),
    revenue_krw: Math.max(0, Math.round(toNumber(first?.revenue_krw))),
  };
}

async function getRangePaymentAgg(db: Db, windowStart: Date): Promise<PaymentRangeAgg> {
  const rows = await db.collection(U.PAYMENTS).aggregate<PaymentRangeAgg>([
    {
      $addFields: {
        _status: {
          $toLower: {
            $convert: { input: { $ifNull: ['$status', ''] }, to: 'string', onError: '', onNull: '' },
          },
        },
        _event_at: {
          $convert: {
            input: { $ifNull: ['$confirmed_at', { $ifNull: ['$paid_at', '$created_at'] }] },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $match: {
        _event_at: { $gte: windowStart },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        failed: {
          $sum: {
            $cond: [{ $in: ['$_status', [...FAILED_PAYMENT_STATUSES]] }, 1, 0],
          },
        },
        success: {
          $sum: {
            $cond: [{ $in: ['$_status', [...SUCCESS_PAYMENT_STATUSES]] }, 1, 0],
          },
        },
      },
    },
    { $project: { _id: 0, total: 1, failed: 1, success: 1 } },
  ]).toArray();

  const first = rows[0];
  return {
    total: Math.max(0, Math.round(toNumber(first?.total))),
    failed: Math.max(0, Math.round(toNumber(first?.failed))),
    success: Math.max(0, Math.round(toNumber(first?.success))),
  };
}

async function getRangeOrderCount(db: Db, windowStart: Date): Promise<number> {
  const rows = await db.collection(U.ORDERS).aggregate<{ count: number }>([
    {
      $addFields: {
        _event_at: {
          $convert: {
            input: { $ifNull: ['$updated_at', '$created_at'] },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    { $match: { _event_at: { $gte: windowStart } } },
    { $count: 'count' },
  ]).toArray();

  return Math.max(0, Math.round(toNumber(rows[0]?.count)));
}

async function getOverdueOrders(
  db: Db,
  now: Date,
  windowStart: Date,
): Promise<SlaOverdueItem[]> {
  const cutoff = new Date(now.getTime() - SLA_HOURS * HOUR_MS);

  const rows = await db.collection(U.ORDERS).aggregate<OverdueOrderAgg>([
    {
      $addFields: {
        _status: {
          $toLower: {
            $convert: { input: { $ifNull: ['$status', ''] }, to: 'string', onError: '', onNull: '' },
          },
        },
        _window_at: {
          $convert: {
            input: { $ifNull: ['$updated_at', '$created_at'] },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
        _started_at: {
          $convert: {
            input: { $ifNull: ['$paid_at', { $ifNull: ['$intake_submitted_at', '$created_at'] }] },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
        _amount_krw: {
          $convert: { input: { $ifNull: ['$amount_krw', '$amount'] }, to: 'double', onError: 0, onNull: 0 },
        },
      },
    },
    {
      $match: {
        _window_at: { $gte: windowStart },
        _started_at: { $lte: cutoff },
        _status: { $nin: [...ORDER_DONE_STATUSES] },
      },
    },
    {
      $project: {
        _id: 0,
        order_id: 1,
        status: { $ifNull: ['$status', 'UNKNOWN'] },
        user_id: 1,
        amount_krw: '$_amount_krw',
        started_at: '$_started_at',
        elapsed_ms: { $subtract: [now, '$_started_at'] },
      },
    },
    { $sort: { started_at: 1 } },
    { $limit: 100 },
  ]).toArray();

  const result: SlaOverdueItem[] = [];

  for (const row of rows) {
    const startedAt = toSafeDate(row.started_at);
    if (!startedAt) {
      continue;
    }

    const dueAt = new Date(startedAt.getTime() + SLA_HOURS * HOUR_MS);
    const elapsedMs = toNumber(row.elapsed_ms);
    const elapsedHours = elapsedMs > 0 ? elapsedMs / HOUR_MS : (now.getTime() - startedAt.getTime()) / HOUR_MS;

    const item: SlaOverdueItem = {
      order_id: typeof row.order_id === 'string' && row.order_id.length > 0 ? row.order_id : '-',
      status: typeof row.status === 'string' && row.status.length > 0 ? row.status : 'UNKNOWN',
      amount_krw: Math.max(0, Math.round(toNumber(row.amount_krw))),
      started_at: toIso(startedAt),
      due_at: toIso(dueAt),
      elapsed_hours: Number(Math.max(0, elapsedHours).toFixed(1)),
    };

    if (typeof row.user_id === 'string') {
      item.user_id = row.user_id;
    }

    result.push(item);
  }

  return result;
}

async function getRangePushAgg(db: Db, collectionName: string, windowStart: Date): Promise<PushRangeAgg> {
  const rows = await db.collection(collectionName).aggregate<PushRangeAgg>([
    {
      $addFields: {
        _status: {
          $toLower: {
            $convert: { input: { $ifNull: ['$status', ''] }, to: 'string', onError: '', onNull: '' },
          },
        },
        _event_at: {
          $convert: {
            input: { $ifNull: ['$sent_at', { $ifNull: ['$created_at', '$updated_at'] }] },
            to: 'date',
            onError: null,
            onNull: null,
          },
        },
        _error_message: {
          $convert: { input: { $ifNull: ['$error_message', ''] }, to: 'string', onError: '', onNull: '' },
        },
      },
    },
    { $match: { _event_at: { $gte: windowStart } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        failed: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $in: ['$_status', [...FAILED_PUSH_STATUSES]] },
                  { $gt: [{ $strLenCP: '$_error_message' }, 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
        sent: {
          $sum: {
            $cond: [{ $in: ['$_status', [...SENT_PUSH_STATUSES]] }, 1, 0],
          },
        },
      },
    },
    { $project: { _id: 0, total: 1, failed: 1, sent: 1 } },
  ]).toArray();

  const first = rows[0];
  return {
    total: Math.max(0, Math.round(toNumber(first?.total))),
    failed: Math.max(0, Math.round(toNumber(first?.failed))),
    sent: Math.max(0, Math.round(toNumber(first?.sent))),
  };
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    const range = parseRange(req.nextUrl.searchParams.get('range'));
    const days = RANGE_DAYS[range];
    const now = new Date();
    const windowStart = new Date(now.getTime() - days * DAY_MS);
    const { start: todayStart, end: todayEnd } = getKstTodayBounds(now);

    const db = await getDbOrThrow();
    const pushCollectionName = await resolvePushCollectionName(db);

    const [todayPayments, rangePayments, overdueItems, pushRange, rangeOrderCount] = await Promise.all([
      getTodayPaymentAgg(db, todayStart, todayEnd),
      getRangePaymentAgg(db, windowStart),
      getOverdueOrders(db, now, windowStart),
      getRangePushAgg(db, pushCollectionName, windowStart),
      getRangeOrderCount(db, windowStart),
    ]);

    const paymentAttempts = Math.max(0, rangePayments.failed + rangePayments.success);
    const paymentFailRate = toPercent(rangePayments.failed, paymentAttempts > 0 ? paymentAttempts : rangePayments.total);
    const pushFailRate = toPercent(pushRange.failed, pushRange.total);
    const mapCallsEstimate = Math.max(
      0,
      Math.round(
        rangeOrderCount * MAP_CALLS_PER_ORDER
        + (paymentAttempts > 0 ? paymentAttempts : rangePayments.total) * MAP_CALLS_PER_PAYMENT_ATTEMPT
        + pushRange.sent * MAP_CALLS_PER_PUSH_SENT,
      ),
    );
    const smsCostEstimate = Math.max(0, Math.round(pushRange.failed * SMS_COST_PER_SEND_KRW));

    const cards: AdminMetricCard[] = [
      {
        id: 'payments_revenue_today',
        title: '오늘 결제/매출',
        value: todayPayments.revenue_krw,
        value_unit: 'krw',
        secondary_value: todayPayments.payment_count,
        secondary_unit: 'count',
        description: '결제 건수',
      },
      {
        id: 'payments_fail_rate',
        title: '결제 실패율',
        value: paymentFailRate,
        value_unit: 'percent',
        description: `${range} 기준 실패 ${rangePayments.failed}건 / 시도 ${paymentAttempts > 0 ? paymentAttempts : rangePayments.total}건`,
      },
      {
        id: 'report_sla_overdue',
        title: '리포트 SLA 48h 초과',
        value: overdueItems.length,
        value_unit: 'count',
        description: '클릭 시 상세 리스트',
      },
      {
        id: 'push_fail_rate',
        title: '푸시 실패율',
        value: pushFailRate,
        value_unit: 'percent',
        description: `${range} 기준 실패 ${pushRange.failed}건 / 총 ${pushRange.total}건`,
      },
      {
        id: 'map_calls_est',
        title: '지도 호출 추정',
        value: mapCallsEstimate,
        value_unit: 'calls',
        description: `${range} 원가 추정 지표`,
      },
      {
        id: 'sms_cost_krw',
        title: 'SMS 비용(옵션)',
        value: smsCostEstimate,
        value_unit: 'krw',
        description: `실패 푸시 ${pushRange.failed}건 기반 추정`,
      },
    ];

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      range,
      generated_at: now.toISOString(),
      cards,
      sla_overdue_items: overdueItems,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
