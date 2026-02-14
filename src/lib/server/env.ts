/**
 * UJUz Web - Environment variable validation
 * Next.js loads .env.local automatically — no dotenv needed.
 * Build-safe defaults are provided for local/CI; deploy environments should override securely.
 */

import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017'),
  MONGODB_DB_NAME: z.string().default('kidsmap'),
  MONGODB_PLACES_COLLECTION: z.string().default('places'),
  MONGODB_INSIGHTS_COLLECTION: z.string().default('refinedInsights'),
  MONGODB_ADMISSION_BLOCKS_COLLECTION: z.string().default('admission_blocks'),
  AUTH_SECRET: z.string().default('dev-auth-secret-change-me'),
  ANTHROPIC_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().default('ujuz-anon-secret-dev'),
  COST_DAILY_BUDGET_USD: z.coerce.number().default(10),
  COST_MONTHLY_BUDGET_USD: z.coerce.number().default(100),
  MEMORY_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // ── Facility Pipeline ──────────────────────────────────
  DATA_GO_KR_API_KEY: z.string().optional(),
  ADMIN_API_KEY: z.string().default(''),

  // ── SMTP (TO Alert email) ────────────────────────────
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('UjuZ <noreply@ujuz.kr>'),

  // ── Strategy Engine ─────────────────────────────────
  STRATEGY_CLAUDE_MODEL: z.string().optional(),

  // ── TO Detection ─────────────────────────────────────
  TO_DETECTION_LOOKBACK_HOURS: z.coerce.number().default(6),
  TO_DETECTION_DEDUP_HOURS: z.coerce.number().default(24),

  // ── Kakao Local API ────────────────────────────────
  KAKAO_REST_API_KEY: z.string().default(''),

  // ── Cron ───────────────────────────────────────────
  CRON_SECRET: z.string().default(''),

  // ── Toss Payments ────────────────────────────────
  TOSS_PAYMENTS_SECRET_KEY: z.string().default(''),

  // ── NCP SMS ──────────────────────────────────────
  NCP_ACCESS_KEY: z.string().default(''),
  NCP_SECRET_KEY: z.string().default(''),
  NCP_SMS_SERVICE_ID: z.string().default(''),
  NCP_SMS_FROM: z.string().default(''),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[UjuZ] Missing or invalid environment variables:\n${issues}`);
  }


  return result.data;
}

export const env = parseEnv();
