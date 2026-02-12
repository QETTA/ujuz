import { describe, it, expect } from 'vitest';

import {
  mapFacilityType,
  mapFacilityStatus,
  parseAddress,
  parseLocation,
  parseExtendedCare,
  parseEmployerName,
  parseCapacityByAge,
  computeRawHash,
  normalizeDataGoKr,
} from '../lib/server/facility/normalizer';
import type { DataGoKrRawFacility } from '../lib/server/facility/types';

// ── Helpers ──────────────────────────────────────────────

/** Minimal valid raw record for normalizeDataGoKr */
function makeRaw(overrides: Partial<DataGoKrRawFacility> = {}): DataGoKrRawFacility {
  return {
    stcode: '11111',
    crname: '해피어린이집',
    crstatusname: '정상',
    crtypename: '국공립',
    craddr: '서울특별시 강남구 테헤란로 123',
    la: '37.5065',
    lo: '127.0536',
    crcapat: '100',
    crcapa: '80',
    ...overrides,
  };
}

// ─── mapFacilityType ─────────────────────────────────────

describe('mapFacilityType', () => {
  it('maps 국공립 → national_public', () => {
    expect(mapFacilityType('국공립')).toBe('national_public');
  });

  it('maps 공립 → public', () => {
    expect(mapFacilityType('공립')).toBe('public');
  });

  it('maps 민간 → private', () => {
    expect(mapFacilityType('민간')).toBe('private');
  });

  it('maps 가정 → home', () => {
    expect(mapFacilityType('가정')).toBe('home');
  });

  it('maps 협동 → cooperative', () => {
    expect(mapFacilityType('협동')).toBe('cooperative');
  });

  it('maps 직장 → workplace', () => {
    expect(mapFacilityType('직장')).toBe('workplace');
  });

  it('handles partial matches (e.g. 국공립어린이집)', () => {
    expect(mapFacilityType('국공립어린이집')).toBe('national_public');
  });

  it('returns other for unknown types', () => {
    expect(mapFacilityType('알수없음')).toBe('other');
    expect(mapFacilityType('')).toBe('other');
  });
});

// ─── mapFacilityStatus ───────────────────────────────────

describe('mapFacilityStatus', () => {
  it('maps 정상 → active', () => {
    expect(mapFacilityStatus('정상')).toBe('active');
  });

  it('maps 운영 → active', () => {
    expect(mapFacilityStatus('운영')).toBe('active');
  });

  it('maps 폐지 → closed', () => {
    expect(mapFacilityStatus('폐지')).toBe('closed');
  });

  it('maps 휴지 → suspended', () => {
    expect(mapFacilityStatus('휴지')).toBe('suspended');
  });

  it('maps 휴원 → suspended', () => {
    expect(mapFacilityStatus('휴원')).toBe('suspended');
  });

  it('handles partial matches', () => {
    expect(mapFacilityStatus('정상운영중')).toBe('active');
  });

  it('defaults to active for unknown status', () => {
    expect(mapFacilityStatus('미확인')).toBe('active');
    expect(mapFacilityStatus('')).toBe('active');
  });
});

// ─── parseAddress ────────────────────────────────────────

describe('parseAddress', () => {
  it('extracts full address, sido, sigungu from craddr', () => {
    const raw = makeRaw({ siession: undefined, siession2: undefined });
    const result = parseAddress(raw);
    expect(result.full).toBe('서울특별시 강남구 테헤란로 123');
    expect(result.sido).toBe('서울특별시');
    expect(result.sigungu).toBe('강남구');
  });

  it('prefers siession/siession2 fields when available', () => {
    const raw = makeRaw({ siession: '부산광역시', siession2: '해운대구' });
    const result = parseAddress(raw);
    expect(result.sido).toBe('부산광역시');
    expect(result.sigungu).toBe('해운대구');
  });

  it('includes zip_code when present', () => {
    const raw = makeRaw({ zipcode: '06241' });
    const result = parseAddress(raw);
    expect(result.zip_code).toBe('06241');
  });

  it('returns undefined zip_code when not present', () => {
    const raw = makeRaw({ zipcode: undefined });
    const result = parseAddress(raw);
    expect(result.zip_code).toBeUndefined();
  });

  it('handles empty address gracefully', () => {
    const raw = makeRaw({ craddr: '', siession: undefined, siession2: undefined });
    const result = parseAddress(raw);
    expect(result.full).toBe('');
    expect(result.sido).toBe('');
    expect(result.sigungu).toBe('');
  });
});

// ─── parseLocation ───────────────────────────────────────

describe('parseLocation', () => {
  it('returns GeoJSON Point for valid Korea coordinates', () => {
    const raw = makeRaw({ la: '37.5065', lo: '127.0536' });
    const result = parseLocation(raw);
    expect(result).toEqual({
      type: 'Point',
      coordinates: [127.0536, 37.5065], // [lng, lat]
    });
  });

  it('returns null for zero coordinates', () => {
    expect(parseLocation(makeRaw({ la: '0', lo: '0' }))).toBeNull();
  });

  it('returns null for non-numeric coordinates', () => {
    expect(parseLocation(makeRaw({ la: 'abc', lo: 'xyz' }))).toBeNull();
  });

  it('returns null for empty coordinates', () => {
    expect(parseLocation(makeRaw({ la: '', lo: '' }))).toBeNull();
    expect(parseLocation(makeRaw({ la: undefined, lo: undefined }))).toBeNull();
  });

  it('returns null for coordinates outside Korea bounding box', () => {
    // Too far south
    expect(parseLocation(makeRaw({ la: '32', lo: '127' }))).toBeNull();
    // Too far north
    expect(parseLocation(makeRaw({ la: '40', lo: '127' }))).toBeNull();
    // Too far west
    expect(parseLocation(makeRaw({ la: '37', lo: '123' }))).toBeNull();
    // Too far east
    expect(parseLocation(makeRaw({ la: '37', lo: '133' }))).toBeNull();
  });

  it('accepts boundary values of Korea bounding box', () => {
    // Southern boundary
    expect(parseLocation(makeRaw({ la: '33', lo: '127' }))).not.toBeNull();
    // Northern boundary
    expect(parseLocation(makeRaw({ la: '39', lo: '127' }))).not.toBeNull();
    // Western boundary
    expect(parseLocation(makeRaw({ la: '37', lo: '124' }))).not.toBeNull();
    // Eastern boundary
    expect(parseLocation(makeRaw({ la: '37', lo: '132' }))).not.toBeNull();
  });
});

// ─── parseExtendedCare ──────────────────────────────────

describe('parseExtendedCare', () => {
  it('returns true when crspec includes 연장보육', () => {
    expect(parseExtendedCare(makeRaw({ crspec: '시간연장형(연장보육)' }))).toBe(true);
  });

  it('returns false when crspec does not include 연장보육', () => {
    expect(parseExtendedCare(makeRaw({ crspec: '장애아전문' }))).toBe(false);
  });
});

// ─── parseEmployerName ──────────────────────────────────

describe('parseEmployerName', () => {
  it('maps crowner to employer_name for workplace facility', () => {
    const raw = makeRaw({ crtypename: '직장', crowner: '  우주테크  ' });
    expect(parseEmployerName(raw)).toBe('우주테크');
  });

  it('returns undefined for non-workplace facility', () => {
    const raw = makeRaw({ crtypename: '국공립', crowner: '우주테크' });
    expect(parseEmployerName(raw)).toBeUndefined();
  });
});

// ─── parseCapacityByAge ──────────────────────────────────

describe('parseCapacityByAge', () => {
  it('parses all age capacity fields', () => {
    const raw = makeRaw({
      child0_cnt: '5',
      child1_cnt: '10',
      child2_cnt: '15',
      child3_cnt: '20',
      child4_cnt: '12',
      child5_cnt: '8',
    });
    const result = parseCapacityByAge(raw);
    expect(result).toEqual({
      age_0: 5,
      age_1: 10,
      age_2: 15,
      age_3: 20,
      age_4: 12,
      age_5_plus: 8,
    });
  });

  it('returns undefined when no capacity fields exist', () => {
    const raw = makeRaw();
    const result = parseCapacityByAge(raw);
    expect(result).toBeUndefined();
  });

  it('ignores zero and negative values', () => {
    const raw = makeRaw({ child0_cnt: '0', child1_cnt: '-3', child2_cnt: '10' });
    const result = parseCapacityByAge(raw);
    expect(result).toEqual({ age_2: 10 });
  });

  it('ignores non-numeric values', () => {
    const raw = makeRaw({ child0_cnt: 'N/A', child1_cnt: '5' });
    const result = parseCapacityByAge(raw);
    expect(result).toEqual({ age_1: 5 });
  });

  it('handles partial data correctly', () => {
    const raw = makeRaw({ child3_cnt: '7' });
    const result = parseCapacityByAge(raw);
    expect(result).toEqual({ age_3: 7 });
  });
});

// ─── computeRawHash ──────────────────────────────────────

describe('computeRawHash', () => {
  it('returns consistent SHA256 hex for same input', () => {
    const data = { a: 1, b: 'hello' };
    const hash1 = computeRawHash(data);
    const hash2 = computeRawHash(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
  });

  it('returns same hash regardless of key order', () => {
    const data1 = { b: 2, a: 1 };
    const data2 = { a: 1, b: 2 };
    expect(computeRawHash(data1)).toBe(computeRawHash(data2));
  });

  it('returns different hash for different data', () => {
    const hash1 = computeRawHash({ a: 1 });
    const hash2 = computeRawHash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });
});

// ─── normalizeDataGoKr ───────────────────────────────────

describe('normalizeDataGoKr', () => {
  it('normalizes a complete valid record', () => {
    const raw = makeRaw({
      crtelno: '02-1234-5678',
      crfnddt: '20100301',
      child0_cnt: '5',
      child1_cnt: '10',
    });
    const result = normalizeDataGoKr(raw);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('data_go_kr');
    expect(result!.provider_id).toBe('11111');
    expect(result!.name).toBe('해피어린이집');
    expect(result!.type).toBe('national_public');
    expect(result!.status).toBe('active');
    expect(result!.location.type).toBe('Point');
    expect(result!.phone).toBe('02-1234-5678');
    expect(result!.capacity_total).toBe(100);
    expect(result!.capacity_current).toBe(80);
    expect(result!.established_date).toBe('20100301');
    expect(result!.capacity_by_age).toEqual({ age_0: 5, age_1: 10 });
    expect(result!.raw_hash).toHaveLength(64);
  });

  it('returns null when location is invalid', () => {
    const raw = makeRaw({ la: '0', lo: '0' });
    expect(normalizeDataGoKr(raw)).toBeNull();
  });

  it('returns null when stcode is missing', () => {
    const raw = makeRaw({ stcode: '' });
    expect(normalizeDataGoKr(raw)).toBeNull();
  });

  it('handles missing optional fields gracefully', () => {
    const raw = makeRaw({
      crtelno: undefined,
      crfnddt: undefined,
      crcapa: undefined,
    });
    const result = normalizeDataGoKr(raw);
    expect(result).not.toBeNull();
    expect(result!.phone).toBeUndefined();
    expect(result!.established_date).toBeUndefined();
    expect(result!.capacity_current).toBeUndefined();
  });

  it('trims whitespace from facility name', () => {
    const raw = makeRaw({ crname: '  공간 어린이집  ' });
    const result = normalizeDataGoKr(raw);
    expect(result!.name).toBe('공간 어린이집');
  });

  it('defaults capacity_total to 0 for non-numeric values', () => {
    const raw = makeRaw({ crcapat: 'N/A' });
    const result = normalizeDataGoKr(raw);
    expect(result!.capacity_total).toBe(0);
  });

  it('produces stable raw_hash for identical raw data', () => {
    const raw1 = makeRaw();
    const raw2 = makeRaw();
    const r1 = normalizeDataGoKr(raw1);
    const r2 = normalizeDataGoKr(raw2);
    expect(r1!.raw_hash).toBe(r2!.raw_hash);
  });

  it('parses extended_care from crspec', () => {
    const withExtended = normalizeDataGoKr(makeRaw({ crspec: '연장보육 운영' }));
    const withoutExtended = normalizeDataGoKr(makeRaw({ crspec: '일반보육' }));
    expect(withExtended!.extended_care).toBe(true);
    expect(withoutExtended!.extended_care).toBe(false);
  });

  it('maps workplace crowner to employer_name', () => {
    const workplace = normalizeDataGoKr(makeRaw({ crtypename: '직장', crowner: '우주전자' }));
    const nonWorkplace = normalizeDataGoKr(makeRaw({ crtypename: '국공립', crowner: '우주전자' }));
    expect(workplace!.employer_name).toBe('우주전자');
    expect(nonWorkplace!.employer_name).toBeUndefined();
  });

  it('keeps location as GeoJSON Point [lng, lat]', () => {
    const result = normalizeDataGoKr(makeRaw({ la: '37.5001', lo: '127.1002' }));
    expect(result!.location).toEqual({
      type: 'Point',
      coordinates: [127.1002, 37.5001],
    });
  });
});
