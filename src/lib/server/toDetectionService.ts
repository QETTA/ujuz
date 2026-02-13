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
import { sendToAlertPush } from './pushService';
import { sendToAlertSms } from './smsService';

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
): Promise<{ alertsCreated: number; emailsQueued: number }> {
  let emailsQueued = 0;
  let persistedAlerts = alerts;

  if (alerts.length > 0) {
    try {
      await db.collection<TOAlertDoc>(U.TO_ALERTS).insertMany(alerts, { ordered: false });
    } catch (err) {
      const writeErrors = (
        typeof err === 'object'
        && err !== null
        && 'writeErrors' in err
        && Array.isArray((err as { writeErrors?: Array<{ code?: number; index?: number }> }).writeErrors)
      )
        ? (err as { writeErrors: Array<{ code?: number; index?: number }> }).writeErrors
        : null;

      if (writeErrors && writeErrors.length > 0 && writeErrors.every((e) => e.code === 11000)) {
        const duplicateIndexes = new Set(
          writeErrors
            .map((e) => e.index)
            .filter((index): index is number => typeof index === 'number'),
        );
        persistedAlerts = alerts.filter((_, index) => !duplicateIndexes.has(index));
      } else if (
        typeof err === 'object'
        && err !== null
        && 'code' in err
        && (err as { code?: number }).code === 11000
      ) {
        persistedAlerts = [];
      } else {
        throw err;
      }
    }

    if (persistedAlerts.length > 0) {
      logger.info(`${logPrefix}: alerts created`, { count: persistedAlerts.length });
    }
  }

  if (FEATURE_FLAGS.toEmailNotification && persistedAlerts.length > 0) {
    try {
      emailsQueued = await sendToAlertEmails(db, persistedAlerts);
    } catch (err) {
      logger.error(`${logPrefix}: email send failed`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Send push notifications for each alert
  if (FEATURE_FLAGS.toPushNotification && persistedAlerts.length > 0) {
    const facilityIds = [...new Set(persistedAlerts.map((alert) => alert.facility_id))];
    const userIds = [...new Set(persistedAlerts.map((alert) => alert.user_id))];
    const subscriptions = await db
      .collection<TOSubscriptionDoc>(U.TO_SUBSCRIPTIONS)
      .find(
        {
          facility_id: { $in: facilityIds },
          user_id: { $in: userIds },
          is_active: true,
        },
        { projection: { facility_id: 1, user_id: 1, notification_preferences: 1 } },
      )
      .toArray();

    const pushPreferenceByKey = new Map<string, boolean>();
    for (const sub of subscriptions) {
      pushPreferenceByKey.set(`${sub.facility_id}|${sub.user_id}`, sub.notification_preferences?.push ?? true);
    }

    for (const alert of persistedAlerts) {
      const canPush = pushPreferenceByKey.get(`${alert.facility_id}|${alert.user_id}`);
      if (canPush === false) {
        logger.debug('TO push notification skipped by user preference', {
          userId: alert.user_id,
          facilityId: alert.facility_id,
        });
        continue;
      }

      try {
        await sendToAlertPush(
          db,
          alert.user_id,
          alert.facility_name,
          alert.age_class,
          alert.estimated_slots,
          alert._id.toString(),
          alert.facility_id,
        );
      } catch (err) {
        logger.error(`${logPrefix}: push send failed`, {
          error: err instanceof Error ? err.message : String(err),
          userId: alert.user_id,
          facilityId: alert.facility_id,
        });
      }
    }
  }

  // Send SMS for premium users who opted in
  if (FEATURE_FLAGS.smsNotification && persistedAlerts.length > 0) {
    for (const alert of persistedAlerts) {
      try {
        // Look up subscription preferences for SMS
        const toSub = await db.collection(U.TO_SUBSCRIPTIONS).findOne({
          user_id: alert.user_id,
          facility_id: alert.facility_id,
          is_active: true,
        });
        if (toSub?.notification_preferences?.sms) {
          // Look up user phone from user profile
          const user = await db.collection(U.USERS).findOne({ user_id: alert.user_id });
          const phone = (user as Record<string, unknown> | null)?.phone as string | undefined;
          if (phone) {
            await sendToAlertSms(db, alert.user_id, phone, alert.facility_name, alert.age_class, alert.estimated_slots);
          }
        }
      } catch (err) {
        logger.error(`${logPrefix}: SMS send failed`, {
          error: err instanceof Error ? err.message : String(err),
          userId: alert.user_id,
        });
      }
    }
  }

  return { alertsCreated: persistedAlerts.length, emailsQueued };
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
  const persisted = await persistAndNotify(db, alerts, 'TO detection');

  return {
    scanned: snapshots.length,
    alerts_created: persisted.alertsCreated,
    emails_queued: persisted.emailsQueued,
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
  const persisted = await persistAndNotify(db, alerts, 'TO detection (single)');

  return {
    scanned: snapshots.length,
    alerts_created: persisted.alertsCreated,
    emails_queued: persisted.emailsQueued,
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
