/**
 * Facility cache service (L1 + L2 + circuit breaker)
 *
 * Layers:
 * - L1: in-memory LRU cache (TTL 5m, max 1000 entries)
 * - L2: MongoDB cache collection (TTL 1h, max 50,000 docs)
 * - L3: data source (data.go.kr) with circuit breaker and stale-while-revalidate
 */

import { AppError } from '../errors';
import { LRUCache } from '../lruCache';
import { U } from '../collections';
import { logger } from '../logger';
import type { Db } from 'mongodb';

export type FacilityCacheNamespace = 'search' | 'detail' | 'nearby';

const L1_TTL_MS = 5 * 60 * 1000;
const L1_MAX_ENTRIES = 1000;

const L2_TTL_MS = 60 * 60 * 1000;
const L2_MAX_ENTRIES = 50_000;

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;

interface FacilityCacheDocument<T = unknown> {
  _id: string;
  cacheKey: string;
  namespace: FacilityCacheNamespace;
  payload: T;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

interface CacheState {
  requests: number;
  hits: number;
  misses: number;
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  staleServed: number;
}

interface CircuitState {
  failures: number[];
  openUntil: number;
}

interface InvalidateOptions {
  clearAll?: boolean;
  namespace?: FacilityCacheNamespace;
  keys?: string[];
}

interface CacheOptions {
  /**
   * Track failures from data.go.kr and trip the breaker on repeated errors.
   */
  trackFailure?: boolean;
}

interface L1CacheEntry {
  key: string;
  namespace: FacilityCacheNamespace;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const l1Cache = new LRUCache<L1CacheEntry>({
  maxSize: L1_MAX_ENTRIES,
  ttlMs: L1_TTL_MS,
});

const circuitState: CircuitState = {
  failures: [],
  openUntil: 0,
};

const stats: CacheState = {
  requests: 0,
  hits: 0,
  misses: 0,
  l1Hits: 0,
  l1Misses: 0,
  l2Hits: 0,
  l2Misses: 0,
  staleServed: 0,
};

const revalidationJobs = new Map<string, Promise<void>>();

function now(): number {
  return Date.now();
}

function asDate(): Date {
  return new Date(now());
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= now();
}

function isCircuitOpen(): boolean {
  return now() < circuitState.openUntil;
}

function clearCircuitIfRecovered() {
  if (now() >= circuitState.openUntil) {
    circuitState.failures = [];
    circuitState.openUntil = 0;
  }
}

function recordFailure(error: unknown) {
  const current = now();
  circuitState.failures = circuitState.failures
    .filter((ts) => current - ts <= CIRCUIT_WINDOW_MS)
    .concat(current);

  if (circuitState.failures.length >= CIRCUIT_FAILURE_THRESHOLD) {
    const openUntil = current + CIRCUIT_COOLDOWN_MS;
    circuitState.openUntil = Math.max(circuitState.openUntil, openUntil);
    circuitState.failures = [];

    logger.warn('Facility cache circuit breaker opened', {
      failures: CIRCUIT_FAILURE_THRESHOLD,
      openUntil: new Date(openUntil).toISOString(),
    });
  }

  logger.warn('Facility data source error', {
    error: error instanceof Error ? error.message : String(error),
    openUntil: circuitState.openUntil ? new Date(circuitState.openUntil).toISOString() : 'not_open',
  });
}

function onSuccess() {
  clearCircuitIfRecovered();
}

function makeL2Document<T>(key: string, namespace: FacilityCacheNamespace, payload: T): FacilityCacheDocument<T> {
  const at = asDate();
  return {
    _id: key,
    cacheKey: key,
    namespace,
    payload,
    createdAt: at,
    updatedAt: at,
    expiresAt: new Date(at.getTime() + L2_TTL_MS),
  };
}

async function getL2<T>(db: Db, key: string, namespace: FacilityCacheNamespace): Promise<{
  entry: FacilityCacheDocument<T>;
  stale: boolean;
} | null> {
  const doc = await db.collection<FacilityCacheDocument<T>>(U.FACILITY_CACHE).findOne({
    _id: key,
    namespace,
  });

  if (!doc) return null;

  return {
    entry: doc,
    stale: isExpired(doc.expiresAt),
  };
}

async function enforceL2Limit(db: Db): Promise<void> {
  const col = db.collection<FacilityCacheDocument>(U.FACILITY_CACHE);
  const total = await col.countDocuments();

  if (total <= L2_MAX_ENTRIES) return;

  const toRemove = total - L2_MAX_ENTRIES;
  const oldest = await col
    .find({}, { projection: { _id: 1 } })
    .sort({ updatedAt: 1 })
    .limit(toRemove)
    .toArray();

  if (oldest.length === 0) return;

  const ids = oldest.map((doc) => doc._id);
  await col.deleteMany({ _id: { $in: ids } });
}

async function writeL2<T>(db: Db, key: string, namespace: FacilityCacheNamespace, payload: T): Promise<void> {
  const nowDate = asDate();
  const doc = makeL2Document(key, namespace, payload);

  await db.collection<FacilityCacheDocument<T>>(U.FACILITY_CACHE).replaceOne(
    { _id: key },
    doc,
    { upsert: true },
  );

  l1Cache.set(key, {
    key,
    namespace,
    payload: doc.payload,
    createdAt: doc.createdAt,
    updatedAt: nowDate,
    expiresAt: doc.expiresAt,
  });

  await enforceL2Limit(db);
}

function startBackgroundRefresh<T>(
  db: Db,
  namespace: FacilityCacheNamespace,
  key: string,
  fetcher: () => Promise<T>,
  trackFailure = false,
) {
  if (revalidationJobs.has(key)) return;

  const job = (async () => {
    try {
      const payload = await fetcher();
      await writeL2(db, key, namespace, payload);
      onSuccess();
      logger.info('Facility cache refreshed in background', {
        namespace,
        key,
      });
    } catch (error) {
      if (trackFailure) {
        recordFailure(error);
      }
      logger.warn('Facility cache background refresh failed', {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      revalidationJobs.delete(key);
    }
  })();

  revalidationJobs.set(key, job);
}

export interface FacilityCacheStats {
  requests: number;
  hits: number;
  misses: number;
  hitRate: number;
  staleServed: number;
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l1Size: number;
  l2Size: number;
  circuitBreakerOpen: boolean;
  circuitOpenUntil?: string;
}

export async function getFacilityCacheStats(db: Db): Promise<FacilityCacheStats> {
  const l2Size = await db.collection<FacilityCacheDocument>(U.FACILITY_CACHE).countDocuments();
  const totalRequests = Math.max(stats.requests, 1);

  return {
    requests: stats.requests,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: ((stats.hits / totalRequests) * 100).toFixed(2),
    staleServed: stats.staleServed,
    l1Hits: stats.l1Hits,
    l1Misses: stats.l1Misses,
    l2Hits: stats.l2Hits,
    l2Misses: stats.l2Misses,
    l1Size: l1Cache.size,
    l2Size,
    circuitBreakerOpen: isCircuitOpen(),
    ...(isCircuitOpen() && { circuitOpenUntil: new Date(circuitState.openUntil).toISOString() }),
  };
}

export async function getCachedFacilityData<T>(
  db: Db,
  key: string,
  namespace: FacilityCacheNamespace,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const trackFailure = options.trackFailure === true;

  stats.requests += 1;

  const l1Value = l1Cache.get(key);
  if (l1Value) {
    // Do not trust stale data in L1 for this path; LRU ttl already handles expiry.
    if (l1Value.payload !== undefined) {
      stats.hits += 1;
      stats.l1Hits += 1;
      logger.info('Facility cache hit', {
        namespace,
        key,
        layer: 'l1',
      });
      return l1Value.payload as T;
    }
  }

  if (!l1Value) {
    stats.l1Misses += 1;
  }

  const l2Result = await getL2<T>(db, key, namespace);

  if (l2Result) {
    if (l2Result.stale) {
      stats.hits += 1;
      stats.l2Hits += 1;
      stats.staleServed += 1;
      logger.info('Facility cache stale hit (revalidating)', {
        namespace,
        key,
      });

      if (!isCircuitOpen()) {
        startBackgroundRefresh(db, namespace, key, fetcher, trackFailure);
      }

      return l2Result.entry.payload;
    }

    l1Cache.set(key, {
      key,
      namespace,
      payload: l2Result.entry.payload,
      createdAt: l2Result.entry.createdAt,
      updatedAt: l2Result.entry.updatedAt,
      expiresAt: l2Result.entry.expiresAt,
    });

    stats.hits += 1;
    stats.l2Hits += 1;
    logger.info('Facility cache hit', {
      namespace,
      key,
      layer: 'l2',
    });

    return l2Result.entry.payload as T;
  }

  stats.misses += 1;
  stats.l2Misses += 1;

  if (isCircuitOpen()) {
    throw new AppError('Facility cache is in cache-only mode due to upstream failures', 503, 'facility_cache_only');
  }

  logger.info('Facility cache miss; fetching from source', {
    namespace,
    key,
  });

  try {
    const payload = await fetcher();
    await writeL2(db, key, namespace, payload);
    onSuccess();
    return payload;
  } catch (error) {
    if (trackFailure) {
      recordFailure(error);
    }
    logger.error('Facility cache fetch failed', {
      namespace,
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function setFacilityCacheValue<T>(
  db: Db,
  key: string,
  namespace: FacilityCacheNamespace,
  payload: T,
): Promise<void> {
  await writeL2(db, key, namespace, payload);
}

export async function invalidateFacilityCache(db: Db, options: InvalidateOptions = {}): Promise<number> {
  const filter: Record<string, unknown> = {};

  if (options.clearAll) {
    // no-op: empty filter matches all documents
  } else if (options.keys && options.keys.length > 0) {
    filter._id = { $in: options.keys };
  } else if (options.namespace) {
    filter.namespace = options.namespace;
  } else {
    return 0;
  }

  const result = await db.collection<FacilityCacheDocument>(U.FACILITY_CACHE).deleteMany(filter);
  l1Cache.clear();

  return result.deletedCount ?? 0;
}

export async function clearFacilityCache(db: Db): Promise<number> {
  return invalidateFacilityCache(db, { clearAll: true });
}

export async function clearFacilityCacheAfterCrawl(db: Db): Promise<number> {
  return clearFacilityCache(db);
}

