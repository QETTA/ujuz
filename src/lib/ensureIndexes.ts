import type { Db } from 'mongodb';
import { COLLECTIONS } from './collections';

let ensured = false;

export async function ensureIndexes(db: Db) {
  if (ensured) return;
  ensured = true;

  await Promise.all([
    db.collection(COLLECTIONS.anonymousSessions).createIndex({ device_hash: 1 }, { unique: true }),
    db.collection(COLLECTIONS.anonymousSessions).createIndex({ last_seen: 1 }),

    db.collection(COLLECTIONS.admissionRequests).createIndex(
      { anon_id: 1, created_at: -1 },
      { background: true },
    ),

    db.collection(COLLECTIONS.toAlerts).createIndex({ anon_id: 1, active: 1 }, { background: true }),
    db.collection(COLLECTIONS.toAlerts).createIndex({ facility_id: 1, active: 1 }, { background: true }),
    db.collection(COLLECTIONS.toAlerts).createIndex({ facility_id: 1, age_class: 1, active: 1 }, { unique: false, background: true }),
    db.collection(COLLECTIONS.toAlerts).createIndex({ alert_id: 1 }, { unique: true }),

    db.collection(COLLECTIONS.posts).createIndex(
      { board_region: 1, type: 1, created_at: -1 },
      { background: true },
    ),
    db.collection(COLLECTIONS.posts).createIndex({ type: 1, score: -1 }, { background: true }),
    db.collection(COLLECTIONS.posts).createIndex({ post_id: 1 }, { unique: true }),

    db.collection(COLLECTIONS.reportsModeration).createIndex(
      { post_id: 1, created_at: -1 },
      { background: true },
    ),
    db.collection(COLLECTIONS.reportsModeration).createIndex({ report_id: 1 }, { unique: true }),

    db.collection(COLLECTIONS.usageCounters).createIndex(
      { subject_id: 1, period: 1, feature: 1 },
      { unique: true },
    ),
  ]);
}
