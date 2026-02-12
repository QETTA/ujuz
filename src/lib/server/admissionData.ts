/**
 * UJUz - Admission Engine Data Layer
 * Database queries for the admission scoring engine.
 */

import { getDbOrThrow } from './db';
import { env } from './env';
import { logger } from './logger';

// ─── Prebuilt Admission Blocks ──────────────────────────────────

export interface AdmissionBlock {
  _id: string;
  facility_id: string;
  block_type: string;
  data: Record<string, unknown>;
  confidence: number;
  is_active: boolean;
  valid_until: Date;
}

export async function readAdmissionBlocks(
  facilityId: string,
): Promise<Map<string, AdmissionBlock> | null> {
  try {
    const db = await getDbOrThrow();
    const blocks = await db
      .collection<AdmissionBlock>(env.MONGODB_ADMISSION_BLOCKS_COLLECTION)
      .find({
        facility_id: facilityId,
        is_active: true,
        valid_until: { $gt: new Date() },
      })
      .toArray();

    if (blocks.length === 0) return null;
    const map = new Map<string, AdmissionBlock>();
    for (const block of blocks) {
      map.set(block.block_type, block);
    }
    return map;
  } catch (err) {
    logger.warn('Failed to read admission blocks', { facilityId, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
