/**
 * UJUz Web - API Route Helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './errors';
import { auth } from './auth';
import { logger } from './logger';

/** Get authenticated user ID from session or fallback to x-device-id header */
export async function getUserId(req: NextRequest): Promise<string> {
  // Try NextAuth session first
  const session = await auth();
  if (session?.userId) return session.userId;

  // Fallback to x-device-id for backward compatibility (with UUID validation)
  const deviceId = req.headers.get('x-device-id');
  if (deviceId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) {
      throw new AppError('잘못된 기기 ID 형식입니다', 400, 'invalid_device_id');
    }
    return deviceId;
  }

  throw new AppError('인증이 필요합니다', 401, 'auth_required');
}

/** Safely parse JSON body with 400 error on malformed input */
export async function parseJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError('잘못된 요청 형식입니다', 400, 'invalid_json');
  }
}

/** Generate a trace ID for request correlation */
export function createTraceId(): string {
  return crypto.randomUUID();
}

/** Read trace ID from middleware-injected header, or generate a new one */
export function getTraceId(req: NextRequest): string {
  return req.headers.get('x-trace-id') || crypto.randomUUID();
}

/** Log a completed request with method, path, status, and duration */
export function logRequest(req: NextRequest, status: number, startMs: number, traceId: string) {
  logger.info('request', {
    method: req.method,
    path: new URL(req.url).pathname,
    status,
    duration_ms: Date.now() - startMs,
    traceId,
  });
}

/** Standard JSON error response */
export function errorResponse(error: unknown, traceId?: string): NextResponse {
  if (error instanceof AppError) {
    const level = error.statusCode >= 500 ? 'error' : 'warn';
    logger[level]('API error', {
      status: error.statusCode,
      code: error.code,
      message: error.message,
      ...(traceId && { traceId }),
    });
    return NextResponse.json(
      { error: error.message, code: error.code, ...(traceId && { traceId }) },
      { status: error.statusCode },
    );
  }

  logger.error('Unhandled API error', {
    error: error instanceof Error ? error.message : String(error),
    ...(traceId && { traceId }),
  });
  return NextResponse.json(
    { error: '서버 오류가 발생했습니다', ...(traceId && { traceId }) },
    { status: 500 },
  );
}
