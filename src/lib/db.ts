import { Db, MongoClient } from 'mongodb';
import { AppError } from './errors';

type MongoState = {
  client: MongoClient | null;
  db: Db | null;
  connecting: Promise<Db> | null;
};

const state: MongoState = {
  client: null,
  db: null,
  connecting: null,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMongo(uri = process.env.MONGODB_URI, dbName = process.env.MONGODB_DB_NAME, maxRetries = 5): Promise<Db> {
  if (!uri || !dbName) {
    throw new AppError('CONFIG_ERROR', 'MONGODB_URI and MONGODB_DB_NAME are required', 500);
  }

  if (state.db) return state.db;
  if (state.connecting) return state.connecting;

  let attempt = 0;
  const attemptConnect = async () => {
    while (true) {
      attempt += 1;
      const client = new MongoClient(uri);
      const db = client.db(dbName);
      try {
        await db.admin().ping();
        state.client = client;
        state.db = db;
        state.connecting = null;
        return db;
      } catch (error) {
        await client.close().catch(() => {});
        if (attempt >= maxRetries) {
          state.connecting = null;
          throw error instanceof AppError
            ? error
            : new AppError('DB_CONNECT_ERROR', 'Failed to connect to MongoDB', 503);
        }
        const waitMs = 250 * 2 ** (attempt - 1);
        await delay(waitMs + Math.floor(Math.random() * 50));
      }
    }
  };

  state.connecting = attemptConnect();
  return state.connecting;
};

export async function closeMongo() {
  if (state.client) {
    await state.client.close();
  }
  state.client = null;
  state.db = null;
  state.connecting = null;
}
