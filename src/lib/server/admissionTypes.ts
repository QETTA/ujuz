/**
 * UJUz - Admission Engine Types
 * Shared types for the admission scoring system.
 */

import type { Grade } from '../types';

export type AdmissionGradeV2 = Grade;

// ─── Legacy Evidence Types (kept for backward compat) ───

export type EvidenceType =
  | 'TO_SNAPSHOT'
  | 'COMMUNITY_AGGREGATE'
  | 'SEASONAL_FACTOR'
  | 'SIMILAR_CASES';

// ─── V1 Standard Evidence Card Types (6 kinds) ─────────

export type EvidenceCardType =
  | 'REGION_COMPETITION'   // was TO_SNAPSHOT
  | 'SEASONALITY'          // was SEASONAL_FACTOR
  | 'YOUR_POSITION'        // was SIMILAR_CASES
  | 'COMMUNITY_SIGNAL'     // was COMMUNITY_AGGREGATE
  | 'FACILITY_SCOPE'       // new
  | 'ACTIONS';             // new — always present

export type SignalDirection = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type SignalStrength = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConfidenceBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface EvidenceSignal {
  name: string;
  direction: SignalDirection;
  strength: SignalStrength;
}

export interface StandardEvidenceCard {
  id: EvidenceCardType;
  title: string;
  summary: string;
  signals: EvidenceSignal[];
  confidence: ConfidenceBand;
  disclaimer?: string;
}

// ─── Legacy Types (existing engine) ────────────────────

export interface AdmissionScoreInputV2 {
  facility_id: string;
  child_age_band: '0' | '1' | '2' | '3' | '4' | '5';
  waiting_position?: number;
  priority_type:
    | 'dual_income'
    | 'sibling'
    | 'single_parent'
    | 'multi_child'
    | 'disability'
    | 'low_income'
    | 'general';
}

export interface EvidenceCardV2 {
  type: EvidenceType;
  summary: string;
  strength: number;
  data: Record<string, unknown>;
}

export interface AdmissionScoreResultV2 {
  probability: number;
  score: number;
  grade: AdmissionGradeV2;
  confidence: number;
  waitMonths: {
    median: number;
    p80: number;
  };
  effectiveWaiting: number;
  posterior: {
    alpha: number;
    beta: number;
  };
  evidenceCards: EvidenceCardV2[];
  version: string;
  asOf: string;
  facility_id: string;
  facility_name: string;
  region_key: string;
  isHeuristicMode?: boolean;
}

// ─── V1 Extended Input (wraps legacy) ──────────────────

export type AgeClass = 'AGE_0' | 'AGE_1' | 'AGE_2' | 'AGE_3' | 'AGE_4' | 'AGE_5';

export interface RegionSpec {
  type: 'ADM_CODE' | 'SIGUNGU' | 'CITY';
  code: string;
  label: string;
}

export interface FacilityScope {
  mode: 'REGION_ONLY' | 'SHORTLIST';
  facility_ids: string[];
}

export interface AdmissionCalcRequest {
  region: RegionSpec;
  age_class: AgeClass;
  wait_rank?: number;
  bonuses: string[];         // multiple priority types
  desired_start_month?: string;  // 'YYYY-MM'
  applied_month?: string | null; // 'YYYY-MM'
  facility_scope: FacilityScope;
}

// ─── V1 Extended Output ────────────────────────────────

export type UncertaintyBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UncertaintyInfo {
  band: UncertaintyBand;
  notes: string[];
}

export interface NextCta {
  type: string;
  label: string;
}

export interface AdmissionCalcResponse {
  request_id: string;
  model_version: string;   // e.g. 'admission-bayes@1.0.0'
  grade: AdmissionGradeV2;
  probability: {
    p_3m: number;
    p_6m: number;
    p_12m: number;
  };
  eta_months: {
    p50: number;
    p90: number;
  };
  evidence_cards: StandardEvidenceCard[];
  uncertainty: UncertaintyInfo;
  next_ctas: NextCta[];
}

// ─── Evidence Type Mapping ─────────────────────────────

export const LEGACY_TO_STANDARD_EVIDENCE: Record<EvidenceType, EvidenceCardType> = {
  TO_SNAPSHOT: 'REGION_COMPETITION',
  SEASONAL_FACTOR: 'SEASONALITY',
  SIMILAR_CASES: 'YOUR_POSITION',
  COMMUNITY_AGGREGATE: 'COMMUNITY_SIGNAL',
};

/** Map legacy EvidenceCardV2 to StandardEvidenceCard */
export function mapLegacyEvidence(card: EvidenceCardV2): StandardEvidenceCard {
  const id = LEGACY_TO_STANDARD_EVIDENCE[card.type] ?? 'REGION_COMPETITION';
  const direction: SignalDirection = card.strength > 0.5 ? 'POSITIVE' : card.strength < -0.5 ? 'NEGATIVE' : 'NEUTRAL';
  const strength: SignalStrength = Math.abs(card.strength) > 0.7 ? 'HIGH' : Math.abs(card.strength) > 0.3 ? 'MEDIUM' : 'LOW';

  return {
    id,
    title: getCardTitle(id),
    summary: card.summary,
    signals: [{ name: card.type, direction, strength }],
    confidence: strength === 'HIGH' ? 'HIGH' : strength === 'MEDIUM' ? 'MEDIUM' : 'LOW',
  };
}

function getCardTitle(type: EvidenceCardType): string {
  switch (type) {
    case 'REGION_COMPETITION': return '지역 경쟁도';
    case 'SEASONALITY': return '시즌성';
    case 'YOUR_POSITION': return '내 위치';
    case 'COMMUNITY_SIGNAL': return '커뮤니티 신호';
    case 'FACILITY_SCOPE': return '시설 선택 영향';
    case 'ACTIONS': return '다음 행동';
  }
}

/** Build the ACTIONS evidence card (always present) */
export function buildActionsCard(grade: string): StandardEvidenceCard {
  const actions: EvidenceSignal[] = [];

  if (grade === 'A' || grade === 'B') {
    actions.push(
      { name: 'TO 알림 등록으로 확정 시점 파악', direction: 'POSITIVE', strength: 'MEDIUM' },
      { name: '입소서류 미리 준비', direction: 'POSITIVE', strength: 'LOW' },
      { name: '2지망 시설도 함께 모니터링', direction: 'NEUTRAL', strength: 'LOW' },
    );
  } else if (grade === 'C' || grade === 'D') {
    actions.push(
      { name: '가점 항목 재확인 (맞벌이 등)', direction: 'POSITIVE', strength: 'HIGH' },
      { name: 'TO 알림으로 빈자리 기회 포착', direction: 'POSITIVE', strength: 'MEDIUM' },
      { name: '인근 시설 추가 지원 고려', direction: 'NEUTRAL', strength: 'MEDIUM' },
    );
  } else {
    actions.push(
      { name: '지역 범위 확대 검색', direction: 'POSITIVE', strength: 'HIGH' },
      { name: '가정어린이집 등 대안 탐색', direction: 'POSITIVE', strength: 'MEDIUM' },
      { name: 'AI 상담으로 맞춤 전략 확인', direction: 'POSITIVE', strength: 'HIGH' },
    );
  }

  return {
    id: 'ACTIONS',
    title: '다음 행동',
    summary: '지금 할 수 있는 3가지',
    signals: actions,
    confidence: 'HIGH',
  };
}

// ─── Uncertainty Band Rules ────────────────────────────

export function computeUncertainty(
  waitRank: number | undefined,
  isRegionFallback: boolean,
  sampleSize: number,
  hasFacilityShortlist: boolean,
): UncertaintyInfo {
  const notes: string[] = [];

  if (waitRank == null) notes.push('대기순번 미입력');
  if (isRegionFallback) notes.push('지역 데이터 fallback 사용');
  if (sampleSize < 5) notes.push('표본 부족');

  if (notes.length > 0) {
    return { band: 'HIGH', notes };
  }

  if (!hasFacilityShortlist) {
    notes.push('시설 shortlist 미지정');
    return { band: 'MEDIUM', notes };
  }

  return { band: 'LOW', notes: ['핵심 입력 완비'] };
}
