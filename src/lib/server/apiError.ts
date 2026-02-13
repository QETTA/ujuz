import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export function apiError(
  error: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error, code, ...(details !== undefined && { details }) },
    { status },
  );
}

// Common errors
export const errors = {
  badRequest: (msg: string, code = 'bad_request', details?: unknown) =>
    apiError(msg, code, 400, details),
  unauthorized: (msg = 'Missing authentication', code = 'auth_required') =>
    apiError(msg, code, 401),
  forbidden: (msg = 'Forbidden', code = 'forbidden') =>
    apiError(msg, code, 403),
  notFound: (msg = 'Not found', code = 'not_found') =>
    apiError(msg, code, 404),
  tooMany: (msg = 'Too many requests', code = 'rate_limited') =>
    apiError(msg, code, 429),
  internal: (msg = 'Internal server error', code = 'internal_error') =>
    apiError(msg, code, 500),
};
