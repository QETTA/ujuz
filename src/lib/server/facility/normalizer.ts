/**
 * Facility normalizer — pure functions converting raw data.go.kr records
 * into canonical FacilityDoc fields.
 */

import { createHash } from 'crypto';
import type {
  FacilityType,
  FacilityStatus,
  FacilityAddress,
  FacilityCapacityByAge,
  GeoJSONPoint,
} from '../dbTypes';
import type { DataGoKrRawFacility } from './types';

// ── Type mapping ─────────────────────────────────────────

const TYPE_MAP: Record<string, FacilityType> = {
  '국공립': 'national_public',
  '공립': 'public',
  '민간': 'private',
  '가정': 'home',
  '협동': 'cooperative',
  '직장': 'workplace',
};

const STATUS_MAP: Record<string, FacilityStatus> = {
  '정상': 'active',
  '운영': 'active',
  '폐지': 'closed',
  '휴지': 'suspended',
  '휴원': 'suspended',
};

export function mapFacilityType(raw: string): FacilityType {
  for (const [key, value] of Object.entries(TYPE_MAP)) {
    if (raw.includes(key)) return value;
  }
  return 'other';
}

export function mapFacilityStatus(raw: string): FacilityStatus {
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (raw.includes(key)) return value;
  }
  return 'active';
}

// ── Address parsing ──────────────────────────────────────

export function parseAddress(raw: DataGoKrRawFacility): FacilityAddress {
  const full = raw.craddr || '';
  const sido = raw.siession || extractSido(full);
  const sigungu = raw.siession2 || extractSigungu(full);

  return {
    full,
    sido,
    sigungu,
    zip_code: raw.zipcode || undefined,
  };
}

function extractSido(addr: string): string {
  const parts = addr.trim().split(/\s+/);
  return parts[0] || '';
}

function extractSigungu(addr: string): string {
  const parts = addr.trim().split(/\s+/);
  return parts[1] || '';
}

// ── GeoJSON ──────────────────────────────────────────────

export function parseLocation(raw: DataGoKrRawFacility): GeoJSONPoint | null {
  const lat = parseFloat(raw.la || '');
  const lng = parseFloat(raw.lo || '');

  if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }

  // Validate Korea bounding box (rough)
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return null;
  }

  return { type: 'Point', coordinates: [lng, lat] };
}

// ── Capacity ─────────────────────────────────────────────

export function parseCapacityByAge(raw: DataGoKrRawFacility): FacilityCapacityByAge | undefined {
  const map: FacilityCapacityByAge = {};
  let hasAny = false;

  const fields: [keyof FacilityCapacityByAge, string][] = [
    ['age_0', 'child0_cnt'],
    ['age_1', 'child1_cnt'],
    ['age_2', 'child2_cnt'],
    ['age_3', 'child3_cnt'],
    ['age_4', 'child4_cnt'],
    ['age_5_plus', 'child5_cnt'],
  ];

  for (const [key, rawKey] of fields) {
    const val = parseInt(raw[rawKey] || '', 10);
    if (isFinite(val) && val > 0) {
      map[key] = val;
      hasAny = true;
    }
  }

  return hasAny ? map : undefined;
}

// ── Hash for change detection ────────────────────────────

export function computeRawHash(raw: Record<string, unknown>): string {
  const sorted = JSON.stringify(raw, Object.keys(raw).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

// ── Full normalization ───────────────────────────────────

// ── Extended care / Employer parsing ────────────────────

export function parseExtendedCare(raw: DataGoKrRawFacility): boolean {
  const spec = (raw.crspec || '').toLowerCase();
  return spec.includes('연장보육') || spec.includes('연장');
}

export function parseEmployerName(raw: DataGoKrRawFacility): string | undefined {
  if (mapFacilityType(raw.crtypename || '') !== 'workplace') return undefined;
  const owner = (raw.crowner || '').trim();
  return owner || undefined;
}

export interface NormalizedFacility {
  provider: 'data_go_kr';
  provider_id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  address: FacilityAddress;
  location: GeoJSONPoint;
  phone?: string;
  capacity_total: number;
  capacity_current?: number;
  capacity_by_age?: FacilityCapacityByAge;
  established_date?: string;
  extended_care?: boolean;
  employer_name?: string;
  raw_hash: string;
}

export function normalizeDataGoKr(raw: DataGoKrRawFacility): NormalizedFacility | null {
  const location = parseLocation(raw);
  if (!location) return null; // skip records without valid coordinates

  const providerId = raw.stcode;
  if (!providerId) return null;

  const capacityTotal = parseInt(raw.crcapat || '', 10);
  const capacityCurrent = parseInt(raw.crcapa || '', 10);

  return {
    provider: 'data_go_kr',
    provider_id: providerId,
    name: (raw.crname || '').trim(),
    type: mapFacilityType(raw.crtypename || ''),
    status: mapFacilityStatus(raw.crstatusname || ''),
    address: parseAddress(raw),
    location,
    phone: raw.crtelno || undefined,
    capacity_total: isFinite(capacityTotal) ? capacityTotal : 0,
    capacity_current: isFinite(capacityCurrent) ? capacityCurrent : undefined,
    capacity_by_age: parseCapacityByAge(raw),
    established_date: raw.crfnddt || undefined,
    extended_care: parseExtendedCare(raw),
    employer_name: parseEmployerName(raw),
    raw_hash: computeRawHash(raw as unknown as Record<string, unknown>),
  };
}
