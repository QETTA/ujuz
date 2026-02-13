import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateAnonSession } from '@/lib/server/anonSession';
import { errorResponse, getTraceId, logRequest } from '@/lib/server/apiHelpers';
import { errors } from '@/lib/server/apiError';
import { anonSessionSchema, parseBody } from '@/lib/server/validation';
import { SignJWT } from 'jose';
import { env } from '@/lib/server/env';

export const runtime = 'nodejs';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET || 'ujuz-anon-secret-dev');

export async function POST(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      logRequest(req, 400, start, traceId);
      return errors.badRequest('Invalid JSON', 'invalid_json');
    }

    const parsed = parseBody(anonSessionSchema, body);
    if (!parsed.success) {
      logRequest(req, 400, start, traceId);
      return errors.badRequest(parsed.error, 'validation_error');
    }

    const { device_fingerprint } = parsed.data;
    const session = await getOrCreateAnonSession(device_fingerprint);

    // Sign JWT
    const anon_token = await new SignJWT({
      anon_id: session.anon_id,
      handle: session.handle,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    logRequest(req, 200, start, traceId);
    return NextResponse.json({
      anon_id: session.anon_id,
      anon_token,
      handle: session.handle,
    });
  } catch (error) {
    const res = errorResponse(error, traceId);
    logRequest(req, res.status, start, traceId);
    return res;
  }
}
