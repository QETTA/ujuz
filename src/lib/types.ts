export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type EvidenceType = 'TO_SNAPSHOT' | 'COMMUNITY_AGGREGATE' | 'SEASONAL_FACTOR' | 'SIMILAR_CASES';

export interface EvidenceCardModel {
  type: EvidenceType;
  summary: string;
  strength: number; // 0..1
  data?: Record<string, unknown>;
  source?: string;
  updatedAt?: string; // ISO
}

export interface AdmissionScoreResultV2 {
  facilityId: string;
  facilityName: string;
  ageBand: number; // 0..5
  regionKey: string;
  waiting: number;
  effectiveWaiting: number;
  probability: number; // 0..1
  priorityType?: string;
  score: number; // 1..99
  grade: Grade;
  confidence: number; // 0..1
  waitMonthsMedian: number;
  waitMonthsP80: number;
  evidenceCards: EvidenceCardModel[];
  updatedAt: string; // ISO
  isHeuristicMode?: boolean;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  regionKey: string;
  type?: '국공립' | '민간' | '가정' | '직장' | '법인';
  capacity?: number;
  distanceKm?: number;
}

export interface ChildProfile {
  nickname: string;
  birthDateMasked: string; // e.g. "2023-**-**"
  ageBand: number; // 0..5
  priorityType?: '일반' | '맞벌이' | '형제 재원' | '다자녀' | '저소득가구' | '한부모가정' | '장애아동';
  regionKey: string;
  interestedFacilities?: { id: string; name: string }[];
}

export interface SubscriptionPlan {
  id: 'free' | 'basic' | 'premium';
  name: string;
  priceMonthly: number;
  priceYearly: number;
  tagline: string;
  features: { label: string; included: boolean }[];
  highlight?: boolean;
}

// Chat / Bot types

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  data_blocks?: { type: string; title: string; content: string; confidence: number; source?: string }[];
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  last_message: string;
  created_at: string;
  updated_at: string;
}

// ── Strategy / Route types ──────────────────────────────

export type RouteGrade = 'HIGH' | 'MEDIUM' | 'LOW';
export type RouteId = 'public' | 'workplace' | 'extended';
export type SheetState = 'MIN' | 'MID' | 'MAX';

export interface WidgetSummary {
  overall_grade: RouteGrade;
  one_liner: string;
  confidence: RouteGrade;
  updated_at: string; // YYYY-MM-DD
}

export interface WeeklyAction {
  key: 'alerts' | 'docs' | 'portfolio';
  title: string;
  cta: string;
  priority: 'HIGH' | 'MEDIUM';
}

export interface RouteCard {
  route_id: RouteId;
  title: string;
  grade: RouteGrade;
  reasons: [string, string, string]; // 항상 3개
  facility_ids: string[];            // Top 3 (기본) ~ 10 (확장)
  next_step?: { title: string; cta: string };
}

export interface WidgetPayload {
  summary: WidgetSummary;
  weekly_actions: [WeeklyAction, WeeklyAction, WeeklyAction];
  routes: [RouteCard, RouteCard, RouteCard]; // 항상 3개 고정
  disclaimer: string;
}

export interface RecommendationResponse {
  recommendation_id: string;
  widget: WidgetPayload;
  facilities: StrategyFacility[]; // enriched from engine — no second fetch needed
}

export interface StrategyFacility {
  id: string;          // provider_id (stcode) — matches RouteCard.facility_ids
  name: string;
  type: string;
  location: { lat: number; lng: number };
  chips: string[];     // ["확률 72%", "대기 ~4개월", "연장 가능"]
  extended: boolean;
  tags: string[];
  score?: number;      // admission score 1–99
  probability?: number; // 6-month probability 0–1
  grade?: string;      // A–F
  wait_months?: number; // median wait (months)
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

// TO Alert types

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
