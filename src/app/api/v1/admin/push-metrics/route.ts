import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { AppError } from '@/lib/server/errors';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { requireAdmin } from '@/lib/server/facility/adminAuth';

export const runtime = 'nodejs';

const RANGE_TO_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
} as const;

const STATUS_DELIVERED = ['ok', 'delivered'];
const STATUS_FAILED = ['error', 'failed'];
const TOKEN_CLEANUP_REASON_REGEX = /DeviceNotRegistered|not registered|unregistered|invalid token/i;

const STATUS_NORMALIZED_EXPR = {
  $toLower: { $ifNull: ['$status', ''] },
};

const FAILURE_REASON_EXPR = {
  $ifNull: [
    '$error_reason',
    {
      $ifNull: [
        '$reason',
        {
          $ifNull: ['$error_message', { $ifNull: ['$details.error', 'Unknown'] }],
        },
      ],
    },
  ],
};

type RangeType = keyof typeof RANGE_TO_MS;
type Summary = { sent: number; delivered: number; failed: number };
type FailureItem = { reason: string; count: number };
type CountItem = { count: number };

function parseRange(value: string | null): RangeType {
  if (value === null || value === '24h') {
    return '24h';
  }
  if (value === '7d') {
    return '7d';
  }
  throw new AppError('range는 24h 또는 7d만 지원합니다', 400, 'validation_error');
}

function buildTimeFilter(since: Date) {
  return {
    $or: [
      { sent_at: { $gte: since } },
      { created_at: { $gte: since } },
    ],
  };
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const range = parseRange(searchParams.get('range'));
    const since = new Date(Date.now() - RANGE_TO_MS[range]);

    const db = await getDbOrThrow();
    const pushLogs = db.collection(U.PUSH_LOGS);
    const timeFilter = buildTimeFilter(since);

    const [summaryRows, failuresTop3, tokenCleanedRows] = await Promise.all([
      pushLogs.aggregate<Summary>([
        { $match: timeFilter },
        { $addFields: { status_norm: STATUS_NORMALIZED_EXPR } },
        {
          $group: {
            _id: null,
            sent: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $in: ['$status_norm', STATUS_DELIVERED] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $in: ['$status_norm', STATUS_FAILED] }, 1, 0] } },
          },
        },
        { $project: { _id: 0, sent: 1, delivered: 1, failed: 1 } },
      ]).toArray(),
      pushLogs.aggregate<FailureItem>([
        { $match: timeFilter },
        {
          $addFields: {
            status_norm: STATUS_NORMALIZED_EXPR,
            failure_reason: FAILURE_REASON_EXPR,
          },
        },
        { $match: { status_norm: { $in: STATUS_FAILED } } },
        { $group: { _id: '$failure_reason', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 3 },
        { $project: { _id: 0, reason: '$_id', count: 1 } },
      ]).toArray(),
      pushLogs.aggregate<CountItem>([
        { $match: timeFilter },
        {
          $addFields: {
            status_norm: STATUS_NORMALIZED_EXPR,
            failure_reason: FAILURE_REASON_EXPR,
          },
        },
        {
          $match: {
            status_norm: { $in: STATUS_FAILED },
            token: { $type: 'string' },
            failure_reason: TOKEN_CLEANUP_REASON_REGEX,
          },
        },
        { $group: { _id: '$token' } },
        { $count: 'count' },
      ]).toArray(),
    ]);

    const summary = summaryRows[0] ?? { sent: 0, delivered: 0, failed: 0 };
    const tokens_cleaned = tokenCleanedRows[0]?.count ?? 0;

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      summary,
      failures_top3: failuresTop3,
      tokens_cleaned,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
