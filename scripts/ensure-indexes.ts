import { MongoClient, type IndexOptions } from 'mongodb';

interface IndexSpec {
  collection: string;
  index: Record<string, any>;
  options?: IndexOptions;
}

const INDEXES: IndexSpec[] = [
  { collection: 'users', index: { user_id: 1 }, options: { unique: true } },
  { collection: 'conversations', index: { user_id: 1, updated_at: -1 } },
  { collection: 'to_subscriptions', index: { user_id: 1, facility_id: 1, is_active: 1 } },
  { collection: 'to_alerts', index: { user_id: 1, detected_at: -1 } },
  {
    collection: 'to_alerts',
    index: { facility_id: 1, age_class: 1, detected_at: -1 },
    options: { unique: true },
  },
  { collection: 'user_subscriptions', index: { user_id: 1, status: 1 } },
  {
    collection: 'user_subscriptions',
    index: { user_id: 1, status: 1 },
    options: { unique: true, partialFilterExpression: { status: 'active' } },
  },
  { collection: 'usage_counters', index: { subject_id: 1, period: 1, feature: 1 }, options: { unique: true } },
  { collection: 'payments', index: { order_id: 1 }, options: { unique: true } },
  { collection: 'payments', index: { user_id: 1, created_at: -1 } },
  { collection: 'payments', index: { payment_key: 1 } },
  { collection: 'push_tokens', index: { user_id: 1 } },
  { collection: 'push_tokens', index: { token: 1 }, options: { unique: true } },
  { collection: 'facilities', index: { location: '2dsphere' } },
  { collection: 'facilities', index: { 'address.sido': 1, 'address.sigungu': 1 } },
  { collection: 'facilities', index: { name: 'text' } },
  { collection: 'facilities', index: { provider_id: 1 }, options: { unique: true } },
  { collection: 'recommendations', index: { user_id: 1, created_at: -1 } },
  { collection: 'admission_scores_cache', index: { cacheKey: 1 }, options: { unique: true } },
  { collection: 'admission_scores_cache', index: { expireAt: 1 }, options: { expireAfterSeconds: 0 } },
  { collection: 'posts', index: { board_region: 1, created_at: -1 } },
  { collection: 'posts', index: { anon_id: 1 } },
  { collection: 'comments', index: { post_id: 1, created_at: 1 } },
  { collection: 'anonymous_sessions', index: { anon_id: 1 }, options: { unique: true } },
  { collection: 'rate_limits', index: { key: 1 }, options: { unique: true } },
  { collection: 'rate_limits', index: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  { collection: 'cost_tracking', index: { date: 1 }, options: { unique: true } },
  { collection: 'sms_delivery_log', index: { user_id: 1, sent_at: -1 } },
  { collection: 'email_delivery_log', index: { user_id: 1, sent_at: -1 } },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  if (!dbName) {
    throw new Error('MONGODB_DB_NAME is required');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    for (const item of INDEXES) {
      const collection = db.collection(item.collection);
      try {
        const name = await collection.createIndex(item.index, item.options);
        console.log(`created ${item.collection}: ${name}`);
      } catch (error: unknown) {
        const err = error as { codeName?: string; code?: number; message?: string };
        if (
          err.code === 85 ||
          err.codeName === 'IndexOptionsConflict' ||
          err.codeName === 'IndexKeySpecsConflict' ||
          /already exists/.test(err.message ?? '')
        ) {
          console.warn(`skipped ${item.collection}: index already exists`);
          continue;
        }

        throw error;
      }
    }
  } finally {
    await client.close();
  }
}

void main().catch((error) => {
  console.error('Failed to create indexes:', error);
  process.exit(1);
});
