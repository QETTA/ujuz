import { getOrCreateDeviceId, getSessionCookie } from '@/lib/auth';

const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3001';

export const BASE_URL = DEFAULT_BASE_URL.replace(/\/$/, '');

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiRequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  deviceId?: string;
  sessionCookie?: string;
}

export interface ApiErrorPayload {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

const buildUrl = (path: string): string => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${suffix}`;
};

export async function requestJson<T>(path: string, config: ApiRequestConfig = {}): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    deviceId: providedDeviceId,
    sessionCookie: providedSessionCookie,
  } = config;

  const deviceId = providedDeviceId ?? (await getOrCreateDeviceId());
  const sessionCookie =
    providedSessionCookie ?? (await getSessionCookie()) ?? undefined;

  const requestHeaders: Record<string, string> = {
    ...headers,
    'x-device-id': deviceId,
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    requestHeaders.Cookie = sessionCookie.includes('session=')
      ? sessionCookie
      : `session=${sessionCookie}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  const data: unknown = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const fallbackError: ApiErrorPayload = {
      error: 'API_ERROR',
      message: response.statusText,
      details: { status: response.status, body: data },
    };

    if (
      data &&
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      'message' in data
    ) {
      throw data as ApiErrorPayload;
    }

    throw fallbackError;
  }

  return data as T;
}

export const getJson = <T>(path: string, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) =>
  requestJson<T>(path, { ...config, method: 'GET' });

export const postJson = <T>(path: string, body: unknown, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) =>
  requestJson<T>(path, { ...config, method: 'POST', body });

export const patchJson = <T>(path: string, body: unknown, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) =>
  requestJson<T>(path, { ...config, method: 'PATCH', body });

export const deleteJson = <T>(path: string, config: Omit<ApiRequestConfig, 'method'> = {}) =>
  requestJson<T>(path, { ...config, method: 'DELETE' });
