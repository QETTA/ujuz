/**
 * Facility pipeline types — raw API shapes, search params, API responses
 */

import type { FacilityDoc, FacilityType, FacilityStatus } from '../dbTypes';

// ── data.go.kr raw response shape ─────────────────────────

export interface DataGoKrRawFacility {
  stcode: string;       // provider_id
  crname: string;       // facility name
  crstatusname: string; // 운영 상태
  crtypename: string;   // facility type name
  craddr: string;       // full address
  crtelno?: string;     // phone
  la?: string;          // latitude
  lo?: string;          // longitude
  crcapat?: string;     // total capacity
  crcapa?: string;      // current enrolled
  zipcode?: string;     // zip code
  crfnddt?: string;     // established date (YYYYMMDD)
  siession?: string;    // sido (시도)
  siession2?: string;   // sigungu (시군구)

  crspec?: string;      // 특성 (연장보육 등)
  crowner?: string;     // 설치자 (직장어린이집 기업명)

  // Age-class capacity (data.go.kr field names)
  child0_cnt?: string;
  child1_cnt?: string;
  child2_cnt?: string;
  child3_cnt?: string;
  child4_cnt?: string;
  child5_cnt?: string;
  [key: string]: string | undefined;
}

export interface DataGoKrResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: { item: DataGoKrRawFacility[] } | '';
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

// ── Search / Query params ────────────────────────────────

export interface FacilitySearchParams {
  sido?: string;
  sigungu?: string;
  type?: FacilityType;
  status?: FacilityStatus;
  name?: string;
  cursor?: string;
  limit?: number;
}

export interface FacilityNearbyParams {
  lng: number;
  lat: number;
  radius_m?: number;
  limit?: number;
  type?: FacilityType;
}

// ── API response shapes ──────────────────────────────────

export interface FacilityListItem {
  id: string;
  provider_id: string;  // stcode — bridges to PlaceDoc.facility_id for admission scoring
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  address: FacilityDoc['address'];
  capacity_total: number;
  capacity_current?: number;
  phone?: string;
  distance_m?: number;
  location?: { lat: number; lng: number };
  extended_care?: boolean;
  employer_name?: string;
}

export interface FacilityListResponse {
  facilities: FacilityListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface FacilityDetailResponse {
  id: string;
  provider: string;
  provider_id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  address: FacilityDoc['address'];
  location: FacilityDoc['location'];
  phone?: string;
  capacity_total: number;
  capacity_current?: number;
  capacity_by_age?: FacilityDoc['capacity_by_age'];
  established_date?: string;
  updated_at: string;
}

// ── Ingest ───────────────────────────────────────────────

export interface IngestResult {
  fetched: number;
  upserted: number;
  skipped: number;
}
