/**
 * Shared DB access helper
 */

import { getMongoDb, connectMongo } from './mongodb';
import { env } from './env';
import { AppError } from './errors';

export async function getDbOrThrow() {
  if (!env.MONGODB_URI || !env.MONGODB_DB_NAME) {
    throw new AppError('MongoDB not configured', 503, 'mongo_not_configured');
  }
  const existing = getMongoDb();
  if (existing) return existing;
  return connectMongo(env.MONGODB_URI, env.MONGODB_DB_NAME);
}

export const connectDb = getDbOrThrow;
