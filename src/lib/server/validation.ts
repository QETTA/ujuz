/**
 * Zod schemas for API request validation
 */

import { z } from 'zod';

// ── Bot / Chat ──────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1, '메시지를 입력해 주세요').max(2000, '메시지는 2000자 이내로 입력해 주세요'),
  conversation_id: z.string().regex(/^[a-f\d]{24}$/i, '유효하지 않은 대화 ID입니다').nullish(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const conversationIdSchema = z.string().regex(/^[a-f\d]{24}$/i, '유효하지 않은 대화 ID입니다');

// ── Admission ───────────────────────────────────────────

const priorityTypeEnum = z.enum(['general', 'dual_income', 'sibling', 'single_parent', 'multi_child', 'disability', 'low_income']).default('general');

export const admissionScoreSchema = z.object({
  facility_id: z.string().min(1, 'facility_id is required').max(100),
  child_age_band: z.coerce.number().int().min(0).max(5).default(2),
  waiting_position: z.coerce.number().int().min(0).max(9999).optional(),
  priority_type: priorityTypeEnum,
});

export const admissionScoreByNameSchema = z.object({
  facility_name: z.string().min(1, 'facility_name is required').max(100),
  region: z.string().max(20).optional(),
  child_age_band: z.coerce.number().int().min(0).max(5).default(2),
  waiting_position: z.coerce.number().int().min(0).max(9999).optional(),
  priority_type: priorityTypeEnum,
});

// ── TO Alerts ───────────────────────────────────────────

export const toAlertSubscribeSchema = z.object({
  facility_id: z.string().min(1, 'facility_id is required').max(100),
  facility_name: z.string().min(1, 'facility_name is required').max(200),
  target_classes: z.array(z.string().max(20)).max(10).default([]),
  notification_preferences: z.object({
    push: z.boolean(),
    sms: z.boolean(),
    email: z.boolean(),
  }).default({ push: true, sms: false, email: false }),
});

export const markAlertsReadSchema = z.object({
  alert_ids: z.array(z.string().regex(/^[a-f\d]{24}$/i, '유효하지 않은 알림 ID')).min(1).max(100),
});

// ── Subscription ────────────────────────────────────────

export const subscriptionCreateSchema = z.object({
  plan_tier: z.enum(['free', 'basic', 'premium'], { message: '유효하지 않은 플랜입니다' }),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

// ── User Profile ────────────────────────────────────────

export const profileUpdateSchema = z.object({
  nickname: z.string().min(1, '닉네임은 1~20자로 입력해 주세요').max(20, '닉네임은 1~20자로 입력해 주세요').optional(),
  ageBand: z.coerce.string().optional(),
  priorityType: z.string().max(20).optional(),
  regionKey: z.string().max(20).optional(),
  interestedFacilities: z.array(z.object({
    id: z.string().max(100),
    name: z.string().max(200),
  })).max(20).optional(),
});

// ── Anonymous Session ───────────────────────────────────

export const anonSessionSchema = z.object({
  device_fingerprint: z.string().min(1, 'device_fingerprint is required').max(500),
});

// ── Community ──────────────────────────────────────────

export const communityPostSchema = z.object({
  board_region: z.string().max(50).default(''),
  type: z.enum(['review', 'to_report', 'question']),
  structured_fields: z.object({
    age_class: z.string().max(20).optional(),
    wait_months: z.coerce.number().int().min(0).max(120).optional(),
    facility_type: z.string().max(50).optional(),
    certainty: z.string().max(20).optional(),
  }).optional(),
  content: z.string().min(1, '내용을 입력해 주세요').max(5000, '내용은 5000자 이내로 입력해 주세요'),
});

export const reportSchema = z.object({
  reason: z.enum(['spam', 'inappropriate', 'misinformation', 'privacy', 'other']),
  detail: z.string().max(1000).optional(),
});

// ── Strategy / Recommendation ──────────────────────────

export const recommendationInputSchema = z.object({
  user_context: z.object({
    home: z.object({ lat: z.number(), lng: z.number() }),
    work: z.object({ lat: z.number(), lng: z.number() }).optional(),
    child_age: z.enum(['0', '1', '2', '3', '4', '5']),
    start_month: z.string().regex(/^\d{4}-\d{2}$/),
    need_extended: z.boolean(),
    employer: z.object({
      name: z.string().max(100),
      owner: z.enum(['self', 'spouse']),
    }).optional(),
  }),
});

// ── Facility Pipeline ──────────────────────────────────

const facilityTypeEnum = z.enum(['national_public', 'public', 'private', 'home', 'cooperative', 'workplace', 'other']);
const facilityStatusEnum = z.enum(['active', 'closed', 'suspended']);

export const facilitySearchSchema = z.object({
  sido: z.string().max(20).optional(),
  sigungu: z.string().max(30).optional(),
  type: facilityTypeEnum.optional(),
  status: facilityStatusEnum.optional(),
  name: z.string().max(100).optional(),
  cursor: z.string().regex(/^[a-f\d]{24}$/i, '유효하지 않은 커서입니다').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const facilityNearbySchema = z.object({
  lng: z.coerce.number().min(124).max(132),
  lat: z.coerce.number().min(33).max(39),
  radius_m: z.coerce.number().int().min(100).max(20_000).default(3000),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const facilityOverrideSchema = z.object({
  field_path: z.string().min(1).max(100),
  new_value: z.unknown(),
  reason: z.string().min(1, '사유를 입력해 주세요').max(500),
});

export const crawlRunSchema = z.object({
  provider: z.enum(['data_go_kr']).default('data_go_kr'),
});

export const facilityIngestSchema = z.object({
  provider: z.enum(['data_go_kr']).default('data_go_kr'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(1000).default(100),
});

// ── Helper ──────────────────────────────────────────────

/** Parse request body with Zod schema. Returns { success: true, data } or { success: false, error }. */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  return { success: false, error: firstIssue?.message ?? '입력 데이터가 올바르지 않습니다' };
}
