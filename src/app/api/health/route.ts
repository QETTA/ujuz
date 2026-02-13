import { NextResponse } from 'next/server';

import { getDbOrThrow } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET() {
  let dbStatus: 'ok' | 'error' = 'ok';
  let status: 'ok' | 'degraded' = 'ok';

  try {
    const db = await getDbOrThrow();
    await db.admin().ping();
  } catch {
    dbStatus = 'error';
    status = 'degraded';
  }

  return NextResponse.json(
    {
      status,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        uptime: process.uptime(),
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
