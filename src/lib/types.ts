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

// ── Strategy Engine types ───────────────────────────────

export type RouteId = 'public' | 'workplace' | 'extended';
export type RouteGrade = 'HIGH' | 'MEDIUM' | 'LOW';
export type SheetState = 'MIN' | 'MID' | 'MAX';

export interface WidgetSummary {
  overall_grade: string;
  one_liner: string;
  confidence: string;
  updated_at: string;
}

export interface WeeklyAction {
  key: string;
  title: string;
  cta: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RouteCard {
  route_id: RouteId;
  title: string;
  grade: RouteGrade;
  reasons: [string, string, string];
  facility_ids: string[];
  next_step?: { title: string; cta: string };
}

export interface WidgetPayload {
  summary: WidgetSummary;
  weekly_actions: [WeeklyAction, WeeklyAction, WeeklyAction];
  routes: [RouteCard, RouteCard, RouteCard];
  disclaimer: string;
}

export interface RecommendationResponse {
  recommendation_id: string;
  widget: WidgetPayload;
  facilities: StrategyFacility[];
}

export interface StrategyFacility {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  chips: string[];
  extended: boolean;
  tags: string[];
  score?: number;
  probability?: number;
  grade?: string;
  wait_months?: number;
}

export interface ChecklistItem {
  key: string;
  title: string;
  reason: string;
  done: boolean;
}

export interface RecommendationInput {
  user_context: {
    home: { lat: number; lng: number };
    work?: { lat: number; lng: number };
    child_age: '0' | '1' | '2' | '3' | '4' | '5';
    start_month: string;
    need_extended: boolean;
    employer?: {
      name: string;
      owner: 'self' | 'spouse';
    };
  };
}

export interface ChildProfile {
  id: string;
  name: string;
  nickname?: string;
  birth_date: string;
  birthDateMasked?: string;
  age_class: string;
  ageBand?: number;
  priorityType?: string;
}

export interface ToAlertSubscription {
  id: string;
  facility_id: string;
  facility_name: string;
  target_classes: string[];
  is_active: boolean;
  notification_preferences?: { push: boolean; sms: boolean; email: boolean };
  created_at: string;
}

export interface ToAlertHistory {
  id: string;
  facility_id: string;
  facility_name: string;
  age_class: string;
  detected_at: string;
  estimated_slots: number;
  confidence: number;
  is_read: boolean;
  source: string;
}

// ── Frontend display types (used by store/components) ────

/** Admission score result flattened for client display */
export interface AdmissionScoreResultV2 {
  facilityId: string;
  facilityName: string;
  ageBand: number;
  regionKey: string;
  waiting: number;
  effectiveWaiting: number;
  probability: number;
  score: number;
  grade: Grade;
  confidence: number;
  waitMonthsMedian: number;
  waitMonthsP80: number;
  evidenceCards: { type: string; summary: string; strength: number; data: Record<string, unknown>; updatedAt: string }[];
  updatedAt: string;
  isHeuristicMode?: boolean;
}

/** Facility place (search result / store item) */
export interface Place {
  id: string;
  name: string;
  address: string;
  regionKey?: string;
  lat?: number;
  lng?: number;
}

/** Chat message (bot conversation) */
export interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data_blocks?: unknown[];
  created_at: string;
}

/** Conversation list item */
export interface ConversationSummary {
  id: string;
  title: string;
  last_message?: string;
  last_message_at: string;
  updated_at?: string;
  message_count: number;
}

/** Evidence card model (flattened for UI) */
export interface EvidenceCardModel {
  type: string;
  summary: string;
  strength: number;
  data?: Record<string, unknown>;
  updatedAt?: string;
  source?: string;
}

/** Subscription plan */
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier?: Tier;
  tagline?: string;
  priceMonthly: number;
  priceYearly: number;
  features: { label: string; included: boolean }[];
  highlight?: boolean;
}
