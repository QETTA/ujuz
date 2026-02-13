import { NextResponse } from 'next/server';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function apiError(
  message: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined && { details }) } },
    { status },
  );
}

// Common errors — codes follow UPPER_SNAKE_CASE (정본)
export const errors = {
  badRequest: (msg: string, code = 'VALIDATION_ERROR', details?: unknown) =>
    apiError(msg, code, 400, details),
  unauthorized: (msg = '인증이 필요합니다', code = 'UNAUTHORIZED') =>
    apiError(msg, code, 401),
  forbidden: (msg = '권한이 없습니다', code = 'FORBIDDEN') =>
    apiError(msg, code, 403),
  notFound: (msg = '찾을 수 없습니다', code = 'NOT_FOUND') =>
    apiError(msg, code, 404),
  conflict: (msg: string, code = 'PLAN_LIMIT_REACHED', details?: unknown) =>
    apiError(msg, code, 409, details),
  tooMany: (msg = '요청이 많아요. 잠시 후 다시 시도해 주세요.', code = 'RATE_LIMITED') =>
    apiError(msg, code, 429),
  internal: (msg = '일시적인 오류가 발생했어요.', code = 'SERVER_ERROR') =>
    apiError(msg, code, 500),
};
