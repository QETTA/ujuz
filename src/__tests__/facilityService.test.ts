import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';

import { docToListItem } from '../lib/server/facility/facilityService';
import type { FacilityDoc } from '../lib/server/dbTypes';

function makeFacilityDoc(overrides: Partial<FacilityDoc> = {}): FacilityDoc {
  return {
    _id: new ObjectId('65a1f3d1f8b88c4b5e5f1001'),
    provider: 'data_go_kr',
    provider_id: '11111',
    name: '해피어린이집',
    type: 'national_public',
    status: 'active',
    address: {
      full: '서울특별시 강남구 테헤란로 123',
      sido: '서울특별시',
      sigungu: '강남구',
    },
    location: {
      type: 'Point',
      coordinates: [127.0536, 37.5065],
    },
    capacity_total: 100,
    raw_hash: 'a'.repeat(64),
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('docToListItem', () => {
  it('converts GeoJSON Point [lng, lat] to { lat, lng }', () => {
    const doc = makeFacilityDoc({
      location: { type: 'Point', coordinates: [127.1234, 37.5678] },
    });

    const result = docToListItem(doc);

    expect(result.location).toEqual({ lat: 37.5678, lng: 127.1234 });
  });

  it('includes extended_care in list item', () => {
    const withExtended = docToListItem(makeFacilityDoc({ extended_care: true }));
    const withoutExtended = docToListItem(makeFacilityDoc({ extended_care: false }));

    expect(withExtended.extended_care).toBe(true);
    expect(withoutExtended.extended_care).toBe(false);
  });
});
