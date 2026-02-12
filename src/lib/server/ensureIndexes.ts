/**
 * UjuZ - Database Index Setup
 * Ensures critical indexes exist on first connection.
 * Called once from connectMongo after successful connection.
 */

import type { Db } from 'mongodb';
import { U } from './collections';
import { env } from './env';
import { logger } from './logger';

let indexed = false;

export async function ensureIndexes(db: Db): Promise<void> {
  if (indexed) return;
  indexed = true;

  try {
    await Promise.all([
      // Rate limits — TTL cleanup
      db.collection(U.RATE_LIMITS).createIndex(
        { expireAt: 1 },
        { expireAfterSeconds: 0, background: true },
      ),

      // Conversations — user lookup sorted by recent
      db.collection(U.CONVERSATIONS).createIndex(
        { user_id: 1, updated_at: -1 },
        { background: true },
      ),

      // TO subscriptions — active subs per user
      db.collection(U.TO_SUBSCRIPTIONS).createIndex(
        { user_id: 1, is_active: 1 },
        { background: true },
      ),

      // TO alerts — history by facility + age class
      db.collection(U.TO_ALERTS).createIndex(
        { facility_id: 1, age_class: 1, detected_at: -1 },
        { background: true },
      ),

      // TO alerts — user unread feed
      db.collection(U.TO_ALERTS).createIndex(
        { user_id: 1, is_read: 1, detected_at: -1 },
        { background: true },
      ),

      // Admission cache — lookup + TTL
      db.collection(U.ADMISSION_CACHE).createIndex(
        { cacheKey: 1 },
        { background: true },
      ),
      db.collection(U.ADMISSION_CACHE).createIndex(
        { expireAt: 1 },
        { expireAfterSeconds: 0, background: true },
      ),

      // User memories — active memories per user
      db.collection(U.USER_MEMORIES).createIndex(
        { userId: 1, isActive: 1, updatedAt: -1 },
        { background: true },
      ),

      // User events — TTL cleanup
      db.collection(U.USER_EVENTS).createIndex(
        { expireAt: 1 },
        { expireAfterSeconds: 0, background: true },
      ),

      // User subscriptions — active sub per user
      db.collection(U.USER_SUBSCRIPTIONS).createIndex(
        { user_id: 1, status: 1 },
        { background: true },
      ),

      // Waitlist snapshots — facility lookup sorted by date
      db.collection(U.WAITLIST_SNAPSHOTS).createIndex(
        { facility_id: 1, snapshot_date: -1 },
        { background: true },
      ),

      // Cost tracking — date lookup for daily/monthly summaries
      db.collection(U.COST_TRACKING).createIndex(
        { date: 1 },
        { unique: true, background: true },
      ),

      // Places — name search with Korean collation (case/accent insensitive)
      db.collection(env.MONGODB_PLACES_COLLECTION).createIndex(
        { name: 1 },
        { background: true, collation: { locale: 'ko', strength: 2 } },
      ),
      // Places — geospatial (populated from facility pipeline sync)
      db.collection(env.MONGODB_PLACES_COLLECTION).createIndex(
        { location: '2dsphere' },
        { background: true, sparse: true },
      ),

      // Anonymous sessions — unique device hash
      db.collection(U.ANONYMOUS_SESSIONS).createIndex(
        { device_hash: 1 },
        { unique: true, background: true },
      ),

      // Admission requests — user history + region feed
      db.collection(U.ADMISSION_REQUESTS).createIndex(
        { anon_id: 1, created_at: -1 },
        { background: true },
      ),
      db.collection(U.ADMISSION_REQUESTS).createIndex(
        { region: 1, created_at: -1 },
        { background: true },
      ),

      // Posts — board listing + hot sort
      db.collection(U.POSTS).createIndex(
        { board_region: 1, type: 1, created_at: -1 },
        { background: true },
      ),
      db.collection(U.POSTS).createIndex(
        { type: 1, score: -1 },
        { background: true },
      ),

      // Reports — per-post lookup
      db.collection(U.REPORTS).createIndex(
        { post_id: 1, created_at: -1 },
        { background: true },
      ),

      // Usage counters — unique per subject+period+feature
      db.collection(U.USAGE_COUNTERS).createIndex(
        { subject_id: 1, period: 1, feature: 1 },
        { unique: true, background: true },
      ),

      // ── Recommendations ────────────────────────────────
      db.collection(U.RECOMMENDATIONS).createIndex(
        { user_id: 1, created_at: -1 },
        { background: true },
      ),
      db.collection(U.RECOMMENDATIONS).createIndex(
        { recommendation_id: 1 },
        { unique: true, background: true },
      ),

      // ── Checklists ────────────────────────────────────
      db.collection(U.CHECKLISTS).createIndex(
        { recommendation_id: 1 },
        { unique: true, background: true },
      ),

      // ── Facility Pipeline ────────────────────────────────

      // Facilities — unique provider+provider_id
      db.collection(U.FACILITIES).createIndex(
        { provider: 1, provider_id: 1 },
        { unique: true, background: true },
      ),
      // Facilities — geospatial
      db.collection(U.FACILITIES).createIndex(
        { location: '2dsphere' },
        { background: true },
      ),
      // Facilities — region + type filter
      db.collection(U.FACILITIES).createIndex(
        { 'address.sido': 1, 'address.sigungu': 1, type: 1 },
        { background: true },
      ),
      // Facilities — name search with Korean collation
      db.collection(U.FACILITIES).createIndex(
        { name: 1 },
        { background: true, collation: { locale: 'ko', strength: 2 } },
      ),
      // Facilities — status filter
      db.collection(U.FACILITIES).createIndex(
        { status: 1 },
        { background: true },
      ),

      // Facility sources — unique provider+provider_id
      db.collection(U.FACILITY_SOURCES).createIndex(
        { provider: 1, provider_id: 1 },
        { unique: true, background: true },
      ),

      // Facility snapshots — facility lookup sorted by date
      db.collection(U.FACILITY_SNAPSHOTS).createIndex(
        { facility_id: 1, snapshot_date: -1 },
        { background: true },
      ),

      // Crawl jobs — status + recent
      db.collection(U.CRAWL_JOBS).createIndex(
        { status: 1, started_at: -1 },
        { background: true },
      ),

      // Facility overrides — per-facility history
      db.collection(U.FACILITY_OVERRIDES).createIndex(
        { facility_id: 1, applied_at: -1 },
        { background: true },
      ),
    ]);

    logger.info('Database indexes ensured');
  } catch (err) {
    // Non-fatal: indexes may already exist or lack permissions
    logger.warn('Failed to ensure some indexes', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
