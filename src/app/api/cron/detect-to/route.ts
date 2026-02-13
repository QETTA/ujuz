import { NextRequest, NextResponse } from 'next/server';
import { getDbOrThrow } from '@/lib/server/db';
import { detectToEvents } from '@/lib/server/toDetectionService';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for full scan

/**
 * Vercel Cron trigger for TO detection.
 * Schedule: every 30 minutes (configured in vercel.json)
 * 
 * Security: Vercel sends `Authorization: Bearer <CRON_SECRET>` header.
 * Manual trigger: POST with `x-admin-key` header matching ADMIN_API_KEY env.
 */
export async function GET(req: NextRequest) {
  // Verify caller is Vercel Cron or admin
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
    const result = await detectToEvents(db);

    logger.info('Cron detect-to completed', { ...result });

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron detect-to failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Detection failed', code: 'internal_error' },
      { status: 500 },
    );
  }
}

// Also support POST for manual triggers
export { GET as POST };
