/**
 * UjuZ - Distributed Rate Limiter (MongoDB-backed)
 * Uses MongoDB TTL collection for cross-instance rate limiting.
 * Falls back to in-memory if DB is unavailable.
 */

import { getDbOrThrow } from './db';
import { logger } from './logger';
import { U } from './collections';

interface RateLimitDoc {
  _id: string;          // key
  count: number;
  resetAt: Date;
  expireAt: Date;        // TTL index field
}

const COLLECTION = U.RATE_LIMITS;

// In-memory fallback for when DB is unavailable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function checkDistributed(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const db = await getDbOrThrow();
  const col = db.collection<RateLimitDoc>(COLLECTION);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const expireAt = new Date(now.getTime() + windowMs + 60_000);

  // Single atomic upsert: increment count, set resetAt/expireAt only on insert
  const result = await col.findOneAndUpdate(
    { _id: key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' },
  );

  if (result) {
    const remaining = Math.max(0, maxRequests - result.count);
    return { allowed: result.count <= maxRequests, remaining };
  }

  // No active window — atomic upsert: increment count, set resetAt/expireAt only on insert
  const upserted = await col.findOneAndUpdate(
    { _id: key },
    {
      $inc: { count: 1 },
      $setOnInsert: { resetAt, expireAt },
    },
    { upsert: true, returnDocument: 'after' },
  );

  if (upserted) {
    // If resetAt is in the past, a stale doc was incremented — reset atomically
    if (upserted.resetAt <= now) {
      await col.replaceOne(
        { _id: key },
        { count: 1, resetAt, expireAt } as RateLimitDoc,
        { upsert: true },
      );
      return { allowed: true, remaining: maxRequests - 1 };
    }
    const remaining = Math.max(0, maxRequests - upserted.count);
    return { allowed: upserted.count <= maxRequests, remaining };
  }

  return { allowed: true, remaining: maxRequests - 1 };
}

function checkMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    return await checkDistributed(key, maxRequests, windowMs);
  } catch (err) {
    logger.warn('Rate limiter DB failed, using in-memory fallback', { key, error: err instanceof Error ? err.message : String(err) });
    return checkMemory(key, maxRequests, windowMs);
  }
}
