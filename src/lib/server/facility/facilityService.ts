/**
 * Facility query service — search, detail, nearby + override application.
 */

import type { Db, Filter, Sort } from 'mongodb';
import { ObjectId } from 'mongodb';
import { U } from '../collections';
import { AppError } from '../errors';
import type { FacilityDoc, FacilityOverrideDoc } from '../dbTypes';
import type {
  FacilitySearchParams,
  FacilityNearbyParams,
  FacilityListItem,
  FacilityListResponse,
  FacilityDetailResponse,
} from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_RADIUS_M = 3000;
const MAX_RADIUS_M = 20_000;

// ── Search ───────────────────────────────────────────────

export async function searchFacilities(
  db: Db,
  params: FacilitySearchParams,
): Promise<FacilityListResponse> {
  const col = db.collection<FacilityDoc>(U.FACILITIES);
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);

  const filter: Filter<FacilityDoc> = {};

  if (params.sido) filter['address.sido'] = params.sido;
  if (params.sigungu) filter['address.sigungu'] = params.sigungu;
  if (params.type) filter.type = params.type;
  if (params.status) {
    filter.status = params.status;
  } else {
    filter.status = 'active'; // default: only active
  }
  if (params.name) {
    filter.name = { $regex: params.name, $options: 'i' };
  }
  if (params.cursor) {
    filter._id = { $gt: new ObjectId(params.cursor) };
  }

  const sortSpec: Sort = { _id: 1 };

  const docs = await col
    .find(filter)
    .sort(sortSpec)
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const results = hasMore ? docs.slice(0, limit) : docs;

  const facilities: FacilityListItem[] = results.map(docToListItem);
  const nextCursor = hasMore && results.length > 0
    ? results[results.length - 1]._id.toString()
    : null;

  return { facilities, next_cursor: nextCursor, has_more: hasMore };
}

// ── Detail ───────────────────────────────────────────────

export async function getFacilityById(
  db: Db,
  id: string,
): Promise<FacilityDetailResponse> {
  if (!ObjectId.isValid(id)) {
    throw new AppError('Invalid facility ID', 400, 'invalid_id');
  }

  const col = db.collection<FacilityDoc>(U.FACILITIES);
  const doc = await col.findOne({ _id: new ObjectId(id) });

  if (!doc) {
    throw new AppError('Facility not found', 404, 'not_found');
  }

  return {
    id: doc._id.toString(),
    provider: doc.provider,
    provider_id: doc.provider_id,
    name: doc.name,
    type: doc.type,
    status: doc.status,
    address: doc.address,
    location: doc.location,
    phone: doc.phone,
    capacity_total: doc.capacity_total,
    capacity_current: doc.capacity_current,
    capacity_by_age: doc.capacity_by_age,
    established_date: doc.established_date,
    updated_at: doc.updated_at.toISOString(),
  };
}

// ── Nearby ───────────────────────────────────────────────

export async function findNearbyFacilities(
  db: Db,
  params: FacilityNearbyParams,
): Promise<FacilityListItem[]> {
  const col = db.collection<FacilityDoc>(U.FACILITIES);
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const radiusM = Math.min(params.radius_m || DEFAULT_RADIUS_M, MAX_RADIUS_M);

  const filter: Filter<FacilityDoc> = {
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [params.lng, params.lat] },
        $maxDistance: radiusM,
      },
    },
    status: 'active',
  };
  if (params.type) filter.type = params.type;

  const docs = await col.find(filter).limit(limit).toArray();

  return docs.map(docToListItem);
}

// ── Override ─────────────────────────────────────────────

export async function applyOverride(
  db: Db,
  facilityId: string,
  fieldPath: string,
  newValue: unknown,
  reason: string,
  appliedBy: string,
): Promise<void> {
  if (!ObjectId.isValid(facilityId)) {
    throw new AppError('Invalid facility ID', 400, 'invalid_id');
  }

  const facilityOid = new ObjectId(facilityId);
  const col = db.collection<FacilityDoc>(U.FACILITIES);
  const overridesCol = db.collection<FacilityOverrideDoc>(U.FACILITY_OVERRIDES);

  const existing = await col.findOne({ _id: facilityOid });
  if (!existing) {
    throw new AppError('Facility not found', 404, 'not_found');
  }

  // Get old value by traversing the field path
  const oldValue = getNestedValue(existing, fieldPath);

  // Apply the override
  await col.updateOne(
    { _id: facilityOid },
    { $set: { [fieldPath]: newValue, updated_at: new Date() } },
  );

  // Record the override
  await overridesCol.insertOne({
    facility_id: facilityOid,
    field_path: fieldPath,
    old_value: oldValue,
    new_value: newValue,
    reason,
    applied_by: appliedBy,
    applied_at: new Date(),
  } as FacilityOverrideDoc);
}

// ── Helpers ──────────────────────────────────────────────

export function docToListItem(doc: FacilityDoc): FacilityListItem {
  const coords = doc.location?.coordinates;
  return {
    id: doc._id.toString(),
    provider_id: doc.provider_id,  // stcode — bridges to PlaceDoc.facility_id
    name: doc.name,
    type: doc.type,
    status: doc.status,
    address: doc.address,
    capacity_total: doc.capacity_total,
    capacity_current: doc.capacity_current,
    phone: doc.phone,
    location: coords ? { lat: coords[1], lng: coords[0] } : undefined,
    extended_care: doc.extended_care,
    employer_name: doc.employer_name,
  };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (current, key) => (current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined),
    obj,
  );
}
