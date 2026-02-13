export type Tier = 'free' | 'basic' | 'premium';

export type RegionType = 'ADM_CODE' | 'SIGUNGU' | 'CITY';

export type AgeClass = 'AGE_0' | 'AGE_1' | 'AGE_2' | 'AGE_3' | 'AGE_4' | 'AGE_5';

export type BonusType =
  | 'dual_income'
  | 'sibling'
  | 'single_parent'
  | 'multi_child'
  | 'disability'
  | 'low_income';

export type FacilityScopeMode = 'REGION_ONLY' | 'SHORTLIST';

export type NotifyMode = 'instant' | 'digest';

export type AdmissionRequestFeature = 'admission_calc' | 'admission_explain' | 'community_write' | 'to_alert_slots';

export type PostType = 'review' | 'to_report' | 'question';

export type ReportReason = 'privacy' | 'spam' | 'abuse' | 'false_info';

export type PostStatus = 'published' | 'hidden';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type GradeBand = 'LOW' | 'MEDIUM' | 'HIGH';

export type UncertaintyBand = 'LOW' | 'MEDIUM' | 'HIGH';

export type EvidenceCardId =
  | 'REGION_COMPETITION'
  | 'SEASONALITY'
  | 'YOUR_POSITION'
  | 'FACILITY_SCOPE'
  | 'COMMUNITY_SIGNAL'
  | 'ACTIONS';

export type SignalDirection = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export type SignalStrength = 'LOW' | 'MEDIUM' | 'HIGH';

export type EvidenceSignal = {
  name: string;
  direction: SignalDirection;
  strength: SignalStrength;
};

export type EvidenceCard = {
  id: EvidenceCardId;
  title: string;
  summary: string;
  signals: EvidenceSignal[];
  confidence: GradeBand;
  disclaimer: string;
};

export type ExplainFocus = 'next_steps' | 'alternatives' | 'docs';

export type UsageFeature = 'admission_calc' | 'admission_explain' | 'community_write' | 'to_alert_slots';

export type PeriodType = 'monthly' | 'daily' | 'active';

export type AdmissionCalcRequest = {
  region: {
    type: RegionType;
    code: string;
    label: string;
  };
  age_class: AgeClass;
  desired_start_month: string;
  applied_month: string | null;
  wait_rank: number | null;
  bonuses: BonusType[];
  facility_scope: {
    mode: FacilityScopeMode;
    facility_ids: string[];
  };
  preferences?: {
    facility_type?: string[];
    max_distance_km?: number;
  };
  client_context?: {
    timezone?: string;
    locale?: string;
  };
};

export type AdmissionResult = {
  grade: Grade;
  probability: {
    p_3m: number;
    p_6m: number;
    p_12m: number;
  };
  eta_months: {
    p50: number;
    p90: number;
  };
  uncertainty: {
    band: UncertaintyBand;
    notes: string[];
  };
};

export type AdmissionCalcResponse = {
  request_id: string;
  model_version: string;
  result: AdmissionResult;
  evidence_cards: EvidenceCard[];
  next_ctas: {
    type: 'EXPLAIN' | 'TO_ALERT';
    label: string;
  }[];
};
