/**
 * Snapshot Diff Service
 * Converts facility_snapshots (capacity_current) into waitlist_snapshots
 * (enrolled_delta, to_detected) by comparing consecutive snapshots.
 */

import type { Db } from 'mongodb';
import { U } from '../collections';
import { logger } from '../logger';
import type { FacilitySnapshotDoc, WaitlistSnapshotDoc, FacilityDoc } from '../dbTypes';
import type { NormalizedFacility } from './normalizer';

const AGE_LABELS: Record<string, string> = {
  age_0: '만0세',
  age_1: '만1세',
  age_2: '만2세',
  age_3: '만3세',
  age_4: '만4세',
  age_5_plus: '만5세이상',
};

/**
 * After a facility_snapshot is inserted, generate a corresponding
 * waitlist_snapshot by diffing against the previous snapshot.
 */
export async function generateWaitlistSnapshot(
  db: Db,
  normalized: NormalizedFacility,
  facilityDoc: FacilityDoc,
): Promise<void> {
  if (normalized.capacity_current == null) {
    logger.debug('Skipping waitlist snapshot: no capacity_current', {
      facilityId: normalized.provider_id,
    });
    return;
  }

  const snapshotsCol = db.collection<FacilitySnapshotDoc>(U.FACILITY_SNAPSHOTS);
  const waitlistCol = db.collection<Partial<WaitlistSnapshotDoc>>(U.WAITLIST_SNAPSHOTS);

  // Find the previous snapshot (second most recent — the most recent is the one just inserted)
  const previousSnapshots = await snapshotsCol
    .find({ facility_id: facilityDoc._id })
    .sort({ snapshot_date: -1 })
    .skip(1)
    .limit(1)
    .toArray();

  const previous = previousSnapshots[0] ?? null;

  let enrolledDelta: number;
  let toDetected: boolean | null;

  if (!previous || previous.capacity_current == null) {
    // First snapshot — no diff possible
    enrolledDelta = 0;
    toDetected = null;
  } else {
    enrolledDelta = normalized.capacity_current - previous.capacity_current;
    toDetected = enrolledDelta < 0;
  }

  // Build waitlist_by_class from capacity_by_age
  const waitlistByClass: Record<string, number> = {};
  if (normalized.capacity_by_age) {
    for (const [key, label] of Object.entries(AGE_LABELS)) {
      const val = normalized.capacity_by_age[key as keyof typeof normalized.capacity_by_age];
      if (val != null && val > 0) {
        waitlistByClass[label] = val;
      }
    }
  }

  await waitlistCol.insertOne({
    facility_id: normalized.provider_id,
    snapshot_date: new Date(),
    waitlist_by_class: Object.keys(waitlistByClass).length > 0 ? waitlistByClass : undefined,
    change: {
      enrolled_delta: enrolledDelta,
      to_detected: toDetected,
    },
  });

  logger.debug('Waitlist snapshot created', {
    facilityId: normalized.provider_id,
    enrolledDelta,
    toDetected,
  });
}
