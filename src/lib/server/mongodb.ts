/**
 * UJUz Web - MongoDB Connection (globalThis singleton for Next.js hot-reload)
 */

import { Db, MongoClient } from 'mongodb';
import { env } from './env';
import { ensureIndexes } from './ensureIndexes';

interface MongoGlobal {
  _mongoClient?: MongoClient;
  _mongoDb?: Db;
  _mongoConnecting?: Promise<MongoClient>;
}

const g = globalThis as unknown as MongoGlobal;

const MAX_POOL_SIZE = 15;
const MIN_POOL_SIZE = 3;
const MAX_IDLE_TIME_MS = 30_000;

export async function connectMongo(
  uri?: string,
  dbName?: string,
  maxRetries = 3,
): Promise<Db> {
  if (g._mongoDb) return g._mongoDb;

  const finalUri = uri || env.MONGODB_URI;
  const finalDb = dbName || env.MONGODB_DB_NAME;

  if (!finalUri) {
    throw new Error('MONGODB_URI is not set');
  }

  let attempt = 0;
  while (true) {
    if (!g._mongoConnecting) {
      g._mongoConnecting = new MongoClient(finalUri, {
        maxPoolSize: MAX_POOL_SIZE,
        minPoolSize: MIN_POOL_SIZE,
        maxIdleTimeMS: MAX_IDLE_TIME_MS,
        serverSelectionTimeoutMS: 5_000,
        connectTimeoutMS: 5_000,
        socketTimeoutMS: 10_000,
      }).connect();
    }

    try {
      g._mongoClient = await g._mongoConnecting;
      g._mongoDb = g._mongoClient.db(finalDb);
      ensureIndexes(g._mongoDb).catch(() => {});
      return g._mongoDb;
    } catch (error) {
      attempt += 1;
      g._mongoConnecting = undefined;
      if (attempt > maxRetries) throw error;
      const delay = 1000 * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }
}

export function getMongoDb(): Db | null {
  return g._mongoDb ?? null;
}

export async function pingMongo(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!g._mongoDb) {
    return { ok: false, error: 'not_connected' };
  }

  try {
    const start = Date.now();
    await g._mongoDb.admin().ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, error: 'ping_failed' };
  }
}
