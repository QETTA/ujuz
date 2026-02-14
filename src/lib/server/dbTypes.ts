/**
 * MongoDB document type definitions for typed collection<T>() calls.
 * CamelCase aliases are added while preserving existing snake_case fields
 * for backward compatibility across current services and persisted docs.
 */

import type { ObjectId } from 'mongodb';

// ─── Bot / Conversations ──────────────────────────────────

export interface BotMessageDoc {
  _id?: ObjectId;
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  data_blocks?: Array<{
    type: string;
    title: string;
    content: string;
    confidence: number;
    source?: string;
  }>;
  dataBlocks?: Array<{
    type: string;
    title: string;
    content: string;
    confidence: number;
    source?: string;
  }>;
  created_at: string;
  createdAt?: string;
}

export interface ConversationDoc {
  _id: ObjectId;
  user_id: string;
  userId?: string;
  title: string;
  messages: BotMessageDoc[];
  created_at: Date;
  createdAt?: Date;
  updated_at: Date;
  updatedAt?: Date;
}

// ─── TO Alerts ────────────────────────────────────────────

export interface TOSubscriptionDoc {
  _id: ObjectId;
  user_id: string;
  userId?: string;
  facility_id: string;
  facilityId?: string;
  facility_name: string;
  facilityName?: string;
  target_classes: string[];
  targetClasses?: string[];
  is_active: boolean;
  isActive?: boolean;
  notification_preferences: { push: boolean; sms: boolean; email: boolean };
  notificationPreferences?: { push: boolean; sms: boolean; email: boolean };
  created_at: Date;
  createdAt?: Date;
}

export interface TOAlertDoc {
  _id: ObjectId;
  user_id: string;
  userId?: string;
  subscription_id: string;
  subscriptionId?: string;
  facility_id: string;
  facilityId?: string;
  facility_name: string;
  facilityName?: string;
  age_class: string;
  ageClass?: string;
  detected_at: Date;
  detectedAt?: Date;
  estimated_slots: number;
  estimatedSlots?: number;
  confidence: number;
  is_read: boolean;
  isRead?: boolean;
  source: string;
}

// ─── User Subscriptions ──────────────────────────────────

export interface UserSubscriptionDoc {
  _id: ObjectId;
  user_id: string;
  userId?: string;
  plan_tier: string;
  planTier?: string;
  billing_cycle: string;
  billingCycle?: string;
  status: string;
  current_period_start: Date;
  currentPeriodStart?: Date;
  current_period_end: Date;
  currentPeriodEnd?: Date;
  admission_scores_used: number;
  admissionScoresUsed?: number;
  to_alerts_active: number;
  toAlertsActive?: number;
  bot_queries_today: number;
  botQueriesToday?: number;
  last_reset: Date;
  lastReset?: Date;
  cancel_at_period_end?: boolean;
  cancel_reason?: string;
  cancel_requested_at?: Date;
  grace_period_end?: Date;
  cancelled_at?: Date;
  created_at: Date;
  createdAt?: Date;
}

// ─── User Memory ─────────────────────────────────────────

export interface UserMemoryDoc {
  _id: ObjectId;
  userId: string;
  memoryKey: string;
  value: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEventDoc {
  _id: ObjectId;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  expireAt: Date;
}

// ─── Data Blocks ─────────────────────────────────────────

export interface DataBlockDoc {
  _id: ObjectId;
  facility_id?: string;
  facilityId?: string;
  targetId?: string;
  blockType: string;
  block_type?: string;
  title: string;
  content: string;
  confidence: number;
  source?: string;
  source_count?: number;
  sourceCount?: number;
  features?: {
    avg_sentiment?: number;
    avgSentiment?: number;
  };
  isActive: boolean;
  is_active?: boolean;
}

// ─── Places ──────────────────────────────────────────────

export interface PlaceDoc {
  _id: ObjectId;
  placeId?: string;
  facility_id?: string;
  facilityId?: string;
  name: string;
  address: string;
  location?: GeoJSONPoint;            // optional — populated from facility pipeline sync
  capacity?: number | Record<string, number>;
  capacity_by_class?: Record<string, number>;
  capacityByClass?: Record<string, number>;
  current_enrolled?: number;
  currentEnrolled?: number;
  premium_subscribers?: number;
  premiumSubscribers?: number;
  type?: string;
}

// ─── Waitlist Snapshots ──────────────────────────────────

export interface WaitlistSnapshotDoc {
  _id: ObjectId;
  facility_id: string;
  facilityId?: string;
  snapshot_date: Date;
  snapshotDate?: Date;
  waitlist_by_class?: Record<string, number>;
  waitlistByClass?: Record<string, number>;
  change?: {
    enrolled_delta?: number;
    enrolledDelta?: number;
    to_detected?: boolean | null;
    toDetected?: boolean | null;
  };
}

// ─── Admission Score Result (stored in cache) ────────────

export interface AdmissionScoreResultV2Doc {
  _id?: ObjectId;
  probability: number;
  score: number;
  grade: string;
  confidence: number;
  waitMonths: { median: number; p80: number };
  effectiveWaiting: number;
  posterior: { alpha: number; beta: number };
  evidenceCards: Array<{ type: string; summary: string; strength: number; data: Record<string, unknown> }>;
  version: string;
  asOf: string;
  facility_id: string;
  facilityId?: string;
  facility_name: string;
  facilityName?: string;
  region_key: string;
  regionKey?: string;
}

// ─── Admission Cache ─────────────────────────────────────

export interface AdmissionCacheDoc {
  _id: ObjectId;
  cacheKey: string;
  result: AdmissionScoreResultV2Doc;
  facility_id: string;
  facilityId?: string;
  child_age_band: string;
  childAgeBand?: string;
  priority_type: string;
  priorityType?: string;
  waiting_position_original: number;
  waitingPositionOriginal?: number;
  w_eff: number;
  wEff?: number;
  expireAt: Date;
  updatedAt: Date;
  createdAt?: Date;
}

// ─── Cost Tracking ───────────────────────────────────────

export interface CostModelUsageDoc {
  calls: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CostDailyDoc {
  _id?: ObjectId;
  date: string; // YYYY-MM-DD
  totalCostUsd: number;
  callCount: number;
  byModel: Record<string, CostModelUsageDoc>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CostMonthlyDoc = Pick<CostDailyDoc, 'date' | 'totalCostUsd'>;

// ─── Anonymous Sessions ─────────────────────────────────

export interface AnonymousSessionDoc {
  _id: ObjectId;
  anon_id: string;
  device_hash: string;
  handle: string;
  trust_level: 'new' | 'established' | 'trusted';
  created_at: Date;
  last_seen: Date;
}

// ─── Admission Requests (history) ───────────────────────

export interface AdmissionRequestDoc {
  _id: ObjectId;
  anon_id: string;
  region: string;
  child_age_class: string;
  wait_rank?: number;
  bonuses: string[];
  facility_ids: string[];
  grade: string;
  probability_6m: number;
  eta_range: { p50: number; p90: number };
  evidence_cards: Array<{
    id: string;
    title: string;
    summary: string;
    signals: Array<{
      name: string;
      direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      strength: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    disclaimer?: string;
  }>;
  model_version: string;
  created_at: Date;
}

// ─── Community Posts ────────────────────────────────────

export interface PostDoc {
  _id: ObjectId;
  title: string;
  category?: '질문' | '정보공유' | '후기' | '자유';
  region?: string;
  authorId: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  isHidden?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  anon_id: string;
  anon_handle: string;
  board_region: string;
  type: 'review' | 'to_report' | 'question';
  structured_fields: {
    age_class?: string;
    wait_months?: number;
    facility_type?: string;
    certainty?: string;
  };
  content: string;
  score: number;
  status: 'published' | 'hidden';
  created_at: Date;
  updated_at?: Date;
  likedBy?: string[];
}

// ─── Reports (moderation) ──────────────────────────────

export interface ReportDoc {
  _id: ObjectId;
  post_id: string;
  reporter_anon_id: string;
  reason: string;
  detail?: string;
  action: 'pending' | 'dismissed' | 'hidden';
  created_at: Date;
}

// ─── Usage Counters ────────────────────────────────────

export interface UsageCounterDoc {
  _id: ObjectId;
  subject_id: string;
  period: string; // e.g. '2026-02' for monthly, '2026-02-12' for daily
  feature: string;
  count: number;
  updated_at: Date;
}

// ─── Recommendations ────────────────────────────────────

export interface RecommendationDoc {
  _id?: ObjectId;
  recommendation_id: string;
  user_id: string;
  user_context: {
    home: { lat: number; lng: number };
    work?: { lat: number; lng: number };
    child_age: string;
    start_month: string;
    need_extended: boolean;
    employer?: { name: string; owner: string };
  };
  widget: {
    summary: { overall_grade: string; one_liner: string; confidence: string; updated_at: string };
    weekly_actions: Array<{ key: string; title: string; cta: string; priority: string }>;
    routes: Array<{
      route_id: string;
      title: string;
      grade: string;
      reasons: [string, string, string];
      facility_ids: string[];
      next_step?: { title: string; cta: string };
    }>;
    disclaimer: string;
  };
  created_at: Date;
}

export interface ChecklistDoc {
  _id?: ObjectId;
  recommendation_id: string;
  user_id: string;
  items: Array<{
    key: string;
    title: string;
    reason: string;
    done: boolean;
  }>;
  created_at: Date;
  updated_at: Date;
}

// ─── Saved Facilities ─────────────────────────────────

export interface SavedFacilityDoc {
  _id?: ObjectId;
  user_id: string;
  facility_id: string;
  saved_at: Date;
  updated_at: Date;
}

// ─── Facility Pipeline ──────────────────────────────────

export interface FacilityAddress {
  full: string;
  sido: string;
  sigungu: string;
  detail?: string;
  zip_code?: string;
}

export interface FacilityCapacityByAge {
  age_0?: number;
  age_1?: number;
  age_2?: number;
  age_3?: number;
  age_4?: number;
  age_5_plus?: number;
  mixed?: number;
}

export type FacilityType = 'national_public' | 'public' | 'private' | 'home' | 'cooperative' | 'workplace' | 'other';
export type FacilityStatus = 'active' | 'closed' | 'suspended';
export type FacilityProvider = 'data_go_kr' | 'childinfo' | 'manual';
export type CrawlJobStatus = 'running' | 'completed' | 'failed';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface FacilityDoc {
  _id: ObjectId;
  provider: FacilityProvider;
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
  operating_hours?: { weekday?: string; saturday?: string; sunday?: string };
  employer_name?: string;   // 직장어린이집 소속 기업명
  employer_id?: string;     // 기업 고유ID (사업자번호 등)
  raw_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface FacilitySourceDoc {
  _id: ObjectId;
  provider: FacilityProvider;
  provider_id: string;
  raw: Record<string, unknown>;
  raw_hash: string;
  fetched_at: Date;
}

export interface FacilitySnapshotDoc {
  _id: ObjectId;
  facility_id: ObjectId;
  snapshot_date: Date;
  capacity_total: number;
  capacity_current?: number;
  capacity_by_age?: FacilityCapacityByAge;
  status: FacilityStatus;
  raw_hash: string;
}

export interface CrawlJobDoc {
  _id: ObjectId;
  provider: FacilityProvider;
  status: CrawlJobStatus;
  total_fetched: number;
  total_upserted: number;
  total_skipped: number;
  error_message?: string;
  started_at: Date;
  finished_at?: Date;
}

export interface FacilityOverrideDoc {
  _id: ObjectId;
  facility_id: ObjectId;
  field_path: string;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  applied_by: string;
  applied_at: Date;
}
