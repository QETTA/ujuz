/**
 * TO Detection Engine
 * Scans WAITLIST_SNAPSHOTS for TO events, matches against active subscriptions,
 * creates TO_ALERTS documents, and optionally queues emails.
 */

import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { U } from './collections';
import { env } from './env';
import { FEATURE_FLAGS } from './featureFlags';
import { logger } from './logger';
import type { TOAlertDoc, TOSubscriptionDoc, WaitlistSnapshotDoc } from './dbTypes';
import { sendToAlertEmails } from './emailService';

export interface DetectionResult {
  scanned: number;
  alerts_created: number;
  emails_queued: number;
}

// ── Shared core logic ────────────────────────────────────

async function createAlertsFromSnapshots(
  db: Db,
  snapshots: WaitlistSnapshotDoc[],
  subscriptions: TOSubscriptionDoc[],
  dedupSince: Date,
): Promise<TOAlertDoc[]> {
  // Build facility→subscriptions lookup
  const subsByFacility = new Map<string, TOSubscriptionDoc[]>();
  for (const sub of subscriptions) {
    const list = subsByFacility.get(sub.facility_id) ?? [];
    list.push(sub);
    subsByFacility.set(sub.facility_id, list);
  }

  // Collect all candidate (facility, ageClass, user) combos
  interface AlertCandidate {
    snap: WaitlistSnapshotDoc;
    sub: TOSubscriptionDoc;
    ageClass: string;
  }
  const candidates: AlertCandidate[] = [];

  for (const snap of snapshots) {
    const matchingSubs = subsByFacility.get(snap.facility_id);
    if (!matchingSubs) continue;

    const ageClasses = deriveAgeClasses(snap);

    for (const sub of matchingSubs) {
      for (const ageClass of ageClasses) {
        if (sub.target_classes.length > 0 && !sub.target_classes.includes(ageClass)) {
          continue;
        }
        candidates.push({ snap, sub, ageClass });
      }
    }
  }

  if (candidates.length === 0) return [];

  // Batch dedup: fetch all existing alerts in one query using $or
  const dedupKeys = candidates.map((c) => ({
    facility_id: c.snap.facility_id,
    age_class: c.ageClass,
    user_id: c.sub.user_id,
  }));

  const existingAlerts = await db
    .collection<TOAlertDoc>(U.TO_ALERTS)
    .find({
      $or: dedupKeys.map((k) => ({
        facility_id: k.facility_id,
        age_class: k.age_class,
        user_id: k.user_id,
        detected_at: { $gte: dedupSince },
      })),
    })
    .project({ facility_id: 1, age_class: 1, user_id: 1 })
    .toArray();

  // Build dedup set for O(1) lookup
  const dedupSet = new Set(
    existingAlerts.map((a) => `${a.facility_id}|${a.age_class}|${a.user_id}`),
  );

  // Create alerts for non-duplicate candidates
  const alerts: TOAlertDoc[] = [];
  for (const { snap, sub, ageClass } of candidates) {
    const dedupKey = `${snap.facility_id}|${ageClass}|${sub.user_id}`;
    if (dedupSet.has(dedupKey)) continue;
    // Mark as seen to prevent duplicates within this batch
    dedupSet.add(dedupKey);

    const enrolledDelta = snap.change?.enrolled_delta ?? snap.change?.enrolledDelta;
    alerts.push({
      _id: new ObjectId(),
      user_id: sub.user_id,
      subscription_id: sub._id.toString(),
      facility_id: snap.facility_id,
      facility_name: sub.facility_name ?? '',
      age_class: ageClass,
      detected_at: snap.snapshot_date,
      estimated_slots: enrolledDelta != null ? Math.abs(enrolledDelta) : 1,
      confidence: snap.change?.to_detected || snap.change?.toDetected ? 0.85 : 0.6,
      is_read: false,
      source: 'auto_detection',
    });
  }

  return alerts;
}

async function persistAndNotify(
  db: Db,
  alerts: TOAlertDoc[],
  logPrefix: string,
): Promise<number> {
  let emailsQueued = 0;

  if (alerts.length > 0) {
    await db.collection<TOAlertDoc>(U.TO_ALERTS).insertMany(alerts);
    logger.info(`${logPrefix}: alerts created`, { count: alerts.length });
  }

  if (FEATURE_FLAGS.toEmailNotification && alerts.length > 0) {
    try {
      emailsQueued = await sendToAlertEmails(db, alerts);
    } catch (err) {
      logger.error(`${logPrefix}: email send failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return emailsQueued;
}

// ── Public API ───────────────────────────────────────────

/**
 * Full scan: detect TO events across all facilities within the lookback window.
 */
export async function detectToEvents(db: Db): Promise<DetectionResult> {
  const lookbackMs = env.TO_DETECTION_LOOKBACK_HOURS * 60 * 60 * 1000;
  const since = new Date(Date.now() - lookbackMs);

  const snapshots = await db
    .collection<WaitlistSnapshotDoc>(U.WAITLIST_SNAPSHOTS)
    .find({
      snapshot_date: { $gte: since },
      $or: [
        { 'change.to_detected': true },
        { 'change.enrolled_delta': { $lt: 0 } },
      ],
    })
    .toArray();

  logger.info('TO detection: snapshots scanned', { count: snapshots.length });

  if (snapshots.length === 0) {
    return { scanned: 0, alerts_created: 0, emails_queued: 0 };
  }

  const facilityIds = [...new Set(snapshots.map((s) => s.facility_id))];

  const subscriptions = await db
    .collection<TOSubscriptionDoc>(U.TO_SUBSCRIPTIONS)
    .find({
      facility_id: { $in: facilityIds },
      is_active: true,
    })
    .toArray();

  if (subscriptions.length === 0) {
    return { scanned: snapshots.length, alerts_created: 0, emails_queued: 0 };
  }

  const dedupMs = env.TO_DETECTION_DEDUP_HOURS * 60 * 60 * 1000;
  const dedupSince = new Date(Date.now() - dedupMs);

  const alerts = await createAlertsFromSnapshots(db, snapshots, subscriptions, dedupSince);
  const emailsQueued = await persistAndNotify(db, alerts, 'TO detection');

  return {
    scanned: snapshots.length,
    alerts_created: alerts.length,
    emails_queued: emailsQueued,
  };
}

/**
 * Single-facility detection — called from ingest pipeline hook.
 */
export async function detectToForFacility(
  db: Db,
  facilityId: string,
): Promise<DetectionResult> {
  const lookbackMs = env.TO_DETECTION_LOOKBACK_HOURS * 60 * 60 * 1000;
  const since = new Date(Date.now() - lookbackMs);

  const snapshots = await db
    .collection<WaitlistSnapshotDoc>(U.WAITLIST_SNAPSHOTS)
    .find({
      facility_id: facilityId,
      snapshot_date: { $gte: since },
      $or: [
        { 'change.to_detected': true },
        { 'change.enrolled_delta': { $lt: 0 } },
      ],
    })
    .toArray();

  if (snapshots.length === 0) {
    return { scanned: 0, alerts_created: 0, emails_queued: 0 };
  }

  const subscriptions = await db
    .collection<TOSubscriptionDoc>(U.TO_SUBSCRIPTIONS)
    .find({ facility_id: facilityId, is_active: true })
    .toArray();

  if (subscriptions.length === 0) {
    return { scanned: snapshots.length, alerts_created: 0, emails_queued: 0 };
  }

  const dedupMs = env.TO_DETECTION_DEDUP_HOURS * 60 * 60 * 1000;
  const dedupSince = new Date(Date.now() - dedupMs);

  const alerts = await createAlertsFromSnapshots(db, snapshots, subscriptions, dedupSince);
  const emailsQueued = await persistAndNotify(db, alerts, 'TO detection (single)');

  return {
    scanned: snapshots.length,
    alerts_created: alerts.length,
    emails_queued: emailsQueued,
  };
}

/**
 * Derive age class labels from a waitlist snapshot.
 * Falls back to 'unknown' if no class info available.
 */
function deriveAgeClasses(snap: WaitlistSnapshotDoc): string[] {
  const wbc = snap.waitlist_by_class ?? snap.waitlistByClass;
  if (wbc && Object.keys(wbc).length > 0) {
    return Object.keys(wbc);
  }
  return ['unknown'];
}
