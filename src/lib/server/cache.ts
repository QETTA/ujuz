import { logger } from './logger';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();
const SWEEP_INTERVAL_MS = 30_000;
let nextSweepAt = Date.now() + SWEEP_INTERVAL_MS;

function sweepExpired(now: number) {
  if (now < nextSweepAt) return;

  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }

  nextSweepAt = now + SWEEP_INTERVAL_MS;
}

export function getCacheValue<T>(key: string): T | undefined {
  const now = Date.now();
  sweepExpired(now);

  const entry = cacheStore.get(key);
  if (!entry) {
    logger.info('cache_miss', { key });
    return undefined;
  }

  if (entry.expiresAt <= now) {
    cacheStore.delete(key);
    logger.info('cache_miss', { key });
    return undefined;
  }

  logger.info('cache_hit', { key });
  return entry.value as T;
}

export function setCacheValue<T>(key: string, value: T, ttlSeconds: number): void {
  const ttlMs = Math.max(0, ttlSeconds) * 1000;
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function deleteCacheValue(key: string): void {
  cacheStore.delete(key);
}

export function clearCache(): void {
  cacheStore.clear();
}
