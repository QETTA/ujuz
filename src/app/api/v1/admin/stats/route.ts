import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';
import { logger } from '@/lib/server/logger';

const ADMIN_WINDOW_MS = 24 * 60 * 60 * 1000;

type SubscriptionBuckets = {
  _id: string;
  count: number;
};

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  const configuredAdminKey = process.env.ADMIN_API_KEY ?? '';

  if (!configuredAdminKey) {
    logger.error('ADMIN_API_KEY is not configured');
    return NextResponse.json(
      { error: 'Admin API is not configured', code: 'admin_not_configured' },
      { status: 503 },
    );
  }

  if (!adminKey || adminKey !== configuredAdminKey) {
    logger.warn('Invalid admin key attempt for /api/v1/admin/stats');
    return NextResponse.json(
      { error: 'Invalid admin key', code: 'admin_unauthorized' },
      { status: 401 },
    );
  }

  try {
    const db = await getDbOrThrow();
    const now = new Date();
    const from = new Date(now.getTime() - ADMIN_WINDOW_MS);

    const subscriptionsPipeline: SubscriptionBuckets[] = await db
      .collection(U.USER_SUBSCRIPTIONS)
      .aggregate<SubscriptionBuckets>([
        {
          $match: {
            status: { $in: ['active', 'trial'] },
            plan_tier: { $in: ['free', 'basic', 'premium'] },
          },
        },
        {
          $group: {
            _id: '$plan_tier',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const [users, alerts24h, paymentsTotal] = await Promise.all([
      db.collection(U.USERS).countDocuments({}),
      db.collection(U.TO_ALERTS).countDocuments({
        $or: [
          { created_at: { $gte: from } },
          { detected_at: { $gte: from } },
          { detectedAt: { $gte: from } },
        ],
      }),
      db.collection(U.PAYMENTS).countDocuments({}),
    ]);

    const subscriptionCount = {
      free: 0,
      basic: 0,
      premium: 0,
    };

    for (const bucket of subscriptionsPipeline) {
      if (bucket._id === 'free' || bucket._id === 'basic' || bucket._id === 'premium') {
        subscriptionCount[bucket._id] = bucket.count;
      }
    }

    logger.info('Admin stats queried', {
      users,
      alerts_24h: alerts24h,
      payments_total: paymentsTotal,
      subscription_free: subscriptionCount.free,
      subscription_basic: subscriptionCount.basic,
      subscription_premium: subscriptionCount.premium,
    });

    return NextResponse.json({
      users,
      subscriptions: subscriptionCount,
      alerts_24h: alerts24h,
      payments_total: paymentsTotal,
    });
  } catch (error) {
    logger.error('Failed to query admin stats', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to load admin stats', code: 'admin_stats_error' },
      { status: 500 },
    );
  }
}
