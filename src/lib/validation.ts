import { z } from 'zod';
import { AppError } from './errors';

export const anonSessionSchema = z.object({
  device_fingerprint: z.string().min(1, 'device_fingerprint is required'),
});

export const admissionCalcSchema = z.object({
  region: z.object({
    type: z.enum(['ADM_CODE', 'SIGUNGU', 'CITY']),
    code: z.string().min(1).max(40),
    label: z.string().min(1).max(80),
  }),
  age_class: z.enum(['AGE_0', 'AGE_1', 'AGE_2', 'AGE_3', 'AGE_4', 'AGE_5']),
  desired_start_month: z.string().regex(/^\d{4}-\d{2}$/),
  applied_month: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  wait_rank: z.number().nonnegative().nullable(),
  bonuses: z.array(z.enum(['dual_income', 'sibling', 'single_parent', 'multi_child', 'disability', 'low_income'])).default([]),
  facility_scope: z.object({
    mode: z.enum(['REGION_ONLY', 'SHORTLIST']),
    facility_ids: z.array(z.string()).default([]),
  }),
  preferences: z
    .object({
      facility_type: z.array(z.string()).optional(),
      max_distance_km: z.number().nonnegative().optional(),
    })
    .optional(),
  client_context: z
    .object({
      timezone: z.string().optional(),
      locale: z.string().optional(),
    })
    .optional(),
});

export const admissionExplainSchema = z.object({
  request_id: z.string().min(4, 'request_id is required'),
  focus: z.enum(['next_steps', 'alternatives', 'docs']),
});

export const toAlertsCreateSchema = z.object({
  facility_id: z.string().min(1, 'facility_id is required'),
  age_class: z.enum(['AGE_0', 'AGE_1', 'AGE_2', 'AGE_3', 'AGE_4', 'AGE_5']),
  notify_mode: z.enum(['instant', 'digest']).default('instant'),
});

export const toAlertsPatchSchema = z.object({
  active: z.boolean(),
});

export const communityPostSchema = z.object({
  board_region: z.string().min(1, 'board_region is required'),
  type: z.enum(['review', 'to_report', 'question']),
  structured_fields: z
    .object({
      age_class: z.string().optional(),
      wait_months: z.number().nonnegative().optional(),
      facility_type: z.string().optional(),
      certainty: z.string().optional(),
    })
    .optional(),
  content: z.string().min(1, 'content is required').max(3000, 'content too long'),
});

export const communityQuerySchema = z.object({
  region: z.string().max(50).optional(),
  type: z.enum(['review', 'to_report', 'question']).optional(),
  sort: z.enum(['recent', 'hot']).default('recent'),
  limit: z.preprocess(
    (value) => (value === undefined ? undefined : Number(value)),
    z.number().int().min(1).max(20).default(20),
  ),
  cursor: z.string().optional(),
});

export const communityReportSchema = z.object({
  reason: z.enum(['privacy', 'spam', 'abuse', 'false_info']),
  detail: z.string().max(1200).optional(),
});

export function validateWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid request';
    throw new AppError('VALIDATION_ERROR', message, 400, {
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}
