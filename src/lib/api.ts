/**
 * UJUz Web - API Client
 * fetch wrapper with x-device-id auto-injection
 */

import { getLocalStorage } from './platform/storage';

// ── API Base URL (web: empty = same-origin, RN: absolute URL) ──

let API_BASE_URL = '';

export function setApiBaseUrl(url: string) {
  API_BASE_URL = url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts (HTTP on mobile)
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16),
  );
}

function getDeviceId(): string {
  const storage = getLocalStorage();
  const key = 'ujuz-device-id';
  let id = storage.getItem(key);
  if (!id) {
    if (typeof window === 'undefined') return 'server';
    id = generateUUID();
    storage.setItem(key, id);
  }
  return id;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {
    'x-device-id': getDeviceId(),
    ...(options?.headers as Record<string, string>),
  };

  if (options?.json) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options?.json ? JSON.stringify(options.json) : options?.body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error: ${res.status}`);
  }

  return res.json();
}
