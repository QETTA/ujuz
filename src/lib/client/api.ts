'use client';

import { apiFetch } from '../api';

export type ApiErrorCode = 'auth_required' | 'rate_limited' | 'upgrade_needed' | 'unknown';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(message: string, code: ApiErrorCode, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Client-side API wrapper that handles common error scenarios:
 * - 401 → redirect to login
 * - 429 → rate limit toast
 * - 403 with upgradeNeeded → redirect to subscription
 */
export async function clientApiFetch<T>(
  path: string,
  options?: RequestInit & { json?: unknown },
): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    if (err instanceof Error) {
      const status = extractStatus(err.message);

      if (status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        throw new ApiError(err.message, 'auth_required', 401);
      }

      if (status === 429) {
        throw new ApiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'rate_limited', 429);
      }

      if (status === 403 && err.message.includes('upgrade')) {
        if (typeof window !== 'undefined') {
          window.location.href = '/subscription';
        }
        throw new ApiError(err.message, 'upgrade_needed', 403);
      }
    }
    throw err;
  }
}

function extractStatus(message: string): number | null {
  const match = message.match(/API error: (\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
