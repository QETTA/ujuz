import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { checkPushReceipts, cleanupInactiveTokens } from '@/lib/server/pushService';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Cron job: Check push notification receipts and clean up dead tokens.
 * Schedule: every 15 minutes
 *
 * Auth: Vercel Cron (CRON_SECRET) or admin key (x-admin-key).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = req.headers.get('x-admin-key');
  const adminApiKey = process.env.ADMIN_API_KEY;

  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = adminApiKey && adminKey === adminApiKey;

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 401 });
  }

  try {
    const db = await getDbOrThrow();

    // 1. Check receipts for pending deliveries
    const receiptResult = await checkPushReceipts(db);

    // 2. Clean up tokens inactive for more than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tokensDeleted = await cleanupInactiveTokens(db, thirtyDaysAgo);

    const result = {
      receipts: receiptResult,
      tokens_cleaned: tokensDeleted,
      timestamp: new Date().toISOString(),
    };

    logger.info('Cron push-receipts completed', { ...result });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error('Cron push-receipts failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Receipt check failed', code: 'internal_error' },
      { status: 500 },
    );
  }
}

export { GET as POST };
