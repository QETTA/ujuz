import { NextResponse } from 'next/server';
import { connectMongo, pingMongo } from '@/lib/server/mongodb';
import { logger } from '@/lib/server/logger';
import { errors } from '@/lib/server/apiError';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectMongo();
    const ping = await pingMongo();
    return NextResponse.json({ status: 'ok', db: ping });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    return errors.internal('Service unavailable', 'health_check_failed');
  }
}
