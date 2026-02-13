import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { checkPushReceipts, cleanupExpiredPushTickets } from '@/lib/server/pushService';
import { env } from '@/lib/server/env';
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
  const cronSecret = env.CRON_SECRET;
  const adminKey = req.headers.get('x-admin-key');
  const adminApiKey = env.ADMIN_API_KEY;

  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdmin = adminApiKey && adminKey === adminApiKey;

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 401 });
  }

  try {
    const db = await getDbOrThrow();

    // 1. Check receipts for pending deliveries
    const receiptResult = await checkPushReceipts(db);
    // 2. Clean up expired sent tickets older than 24h
    const ticketsDeleted = await cleanupExpiredPushTickets(db);
    const result = {
      receipts: receiptResult,
      tickets_cleaned: ticketsDeleted,
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
