/** UJUz collection name constants */
export const U = {
  USERS: 'users',
  USER_MEMORIES: 'user_memories',
  USER_EVENTS: 'user_events',
  ADMISSION_CACHE: 'admission_scores_cache',
  COST_TRACKING: 'cost_tracking',
  CONVERSATIONS: 'conversations',
  TO_SUBSCRIPTIONS: 'to_subscriptions',
  TO_ALERTS: 'to_alerts',
  USER_SUBSCRIPTIONS: 'user_subscriptions',
  RATE_LIMITS: 'rate_limits',
  DATA_BLOCKS: 'dataBlocks',
  WAITLIST_SNAPSHOTS: 'waitlist_snapshots',
  ANONYMOUS_SESSIONS: 'anonymous_sessions',
  ADMISSION_REQUESTS: 'admission_requests',
  POSTS: 'posts',
  REPORTS: 'reports_moderation',
  CONSULTATION_REPORTS: 'reports',
  USAGE_COUNTERS: 'usage_counters',

  // ── Recommendations / Checklists ──────────────────────
  RECOMMENDATIONS: 'recommendations',
  CHECKLISTS: 'checklists',

  // ── Push & Delivery ──────────────────────────────────
  PUSH_TOKENS: 'push_tokens',
  PUSH_LOGS: 'push_logs',
  PUSH_DELIVERY_LOG: 'push_delivery_log',
  EMAIL_DELIVERY_LOG: 'email_delivery_log',

  // ── Community ──────────────────────────────────────────
  COMMENTS: 'comments',

  // ── Payments & SMS ───────────────────────────────────
  PAYMENTS: 'payments',
  REFUND_REQUESTS: 'refund_requests',
  SMS_SETTINGS: 'sms_settings',
  SMS_LOGS: 'sms_logs',
  SMS_DELIVERY_LOG: 'sms_delivery_log',

  // ── User Settings ────────────────────────────────────
  NOTIFICATION_SETTINGS: 'notification_settings',

  // ── Consultations ────────────────────────────────────
  ORDERS: 'orders',
  APPOINTMENTS: 'appointments',

  // ── Partner (B2B) ────────────────────────────────────
  PARTNERS: 'partners',
  LEADS: 'leads',

  // ── Facility Pipeline ──────────────────────────────────
  FACILITY_CACHE: 'facility_cache',
  FACILITIES: 'facilities',
  FACILITY_SOURCES: 'facility_sources',
  FACILITY_SNAPSHOTS: 'facility_snapshots',
  CRAWL_JOBS: 'crawl_jobs',
  FACILITY_OVERRIDES: 'facility_overrides',
  SAVED_FACILITIES: 'saved_facilities',
} as const;
