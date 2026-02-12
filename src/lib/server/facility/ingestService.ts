/**
 * Facility ingest service — upserts raw records into
 * facility_sources → facilities → facility_snapshots.
 */

import type { Db } from 'mongodb';
import { U } from '../collections';
import { logger } from '../logger';
import { FEATURE_FLAGS } from '../featureFlags';
import type { FacilityDoc, FacilitySourceDoc, FacilitySnapshotDoc } from '../dbTypes';
import { normalizeDataGoKr, computeRawHash } from './normalizer';
import { generateWaitlistSnapshot } from './snapshotDiffService';
import type { DataGoKrRawFacility, IngestResult } from './types';

/**
 * Ingests a batch of raw data.go.kr records.
 * Idempotent: uses raw_hash to skip unchanged records.
 */
export async function ingestBatch(
  db: Db,
  rawRecords: DataGoKrRawFacility[],
): Promise<IngestResult> {
  let upserted = 0;
  let skipped = 0;

  const sourcesCol = db.collection<FacilitySourceDoc>(U.FACILITY_SOURCES);
  const facilitiesCol = db.collection<FacilityDoc>(U.FACILITIES);
  const snapshotsCol = db.collection<FacilitySnapshotDoc>(U.FACILITY_SNAPSHOTS);

  for (const raw of rawRecords) {
    try {
      const normalized = normalizeDataGoKr(raw);
      if (!normalized) {
        skipped++;
        continue;
      }

      const rawHash = computeRawHash(raw as unknown as Record<string, unknown>);

      // Check if source already exists with same hash
      const existingSource = await sourcesCol.findOne({
        provider: normalized.provider,
        provider_id: normalized.provider_id,
      });

      if (existingSource && existingSource.raw_hash === rawHash) {
        skipped++;
        continue;
      }

      const now = new Date();

      // Upsert source (raw preservation)
      await sourcesCol.updateOne(
        { provider: normalized.provider, provider_id: normalized.provider_id },
        {
          $set: {
            raw: raw as unknown as Record<string, unknown>,
            raw_hash: rawHash,
            fetched_at: now,
          },
        },
        { upsert: true },
      );

      // Upsert canonical facility
      const facilityResult = await facilitiesCol.findOneAndUpdate(
        { provider: normalized.provider, provider_id: normalized.provider_id },
        {
          $set: {
            name: normalized.name,
            type: normalized.type,
            status: normalized.status,
            address: normalized.address,
            location: normalized.location,
            phone: normalized.phone,
            capacity_total: normalized.capacity_total,
            capacity_current: normalized.capacity_current,
            capacity_by_age: normalized.capacity_by_age,
            established_date: normalized.established_date,
            raw_hash: rawHash,
            updated_at: now,
          },
          $setOnInsert: {
            created_at: now,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );

      // Create snapshot for change tracking
      if (facilityResult) {
        await snapshotsCol.insertOne({
          facility_id: facilityResult._id,
          snapshot_date: now,
          capacity_total: normalized.capacity_total,
          capacity_current: normalized.capacity_current,
          capacity_by_age: normalized.capacity_by_age,
          status: normalized.status,
          raw_hash: rawHash,
        } as FacilitySnapshotDoc);

        // Generate waitlist snapshot from facility snapshot diff
        try {
          await generateWaitlistSnapshot(db, normalized, facilityResult);
        } catch (err) {
          logger.warn('Waitlist snapshot generation failed', {
            facilityId: normalized.provider_id,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Fire-and-forget TO detection for this facility
        if (FEATURE_FLAGS.toDetection) {
          import('../toDetectionService')
            .then(({ detectToForFacility }) => detectToForFacility(db, normalized.provider_id))
            .catch((err) => logger.warn('TO detection hook failed', {
              facilityId: normalized.provider_id,
              error: err instanceof Error ? err.message : String(err),
            }));
        }
      }

      upserted++;
    } catch (err) {
      logger.warn('Facility ingest error for record', {
        provider_id: raw.stcode,
        error: err instanceof Error ? err.message : String(err),
      });
      skipped++;
    }
  }

  return { fetched: rawRecords.length, upserted, skipped };
}
