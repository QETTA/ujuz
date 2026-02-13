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
  USAGE_COUNTERS: 'usage_counters',

  // ── Recommendations / Checklists ──────────────────────
  RECOMMENDATIONS: 'recommendations',
  CHECKLISTS: 'checklists',

  // ── Push & Delivery ──────────────────────────────────
  PUSH_TOKENS: 'push_tokens',
  PUSH_DELIVERY_LOG: 'push_delivery_log',
  EMAIL_DELIVERY_LOG: 'email_delivery_log',

  // ── Community ──────────────────────────────────────────
  COMMENTS: 'comments',

  // ── Payments & SMS ───────────────────────────────────
  PAYMENTS: 'payments',
  REFUND_REQUESTS: 'refund_requests',
  SMS_DELIVERY_LOG: 'sms_delivery_log',

  // ── Facility Pipeline ──────────────────────────────────
  FACILITIES: 'facilities',
  FACILITY_SOURCES: 'facility_sources',
  FACILITY_SNAPSHOTS: 'facility_snapshots',
  CRAWL_JOBS: 'crawl_jobs',
  FACILITY_OVERRIDES: 'facility_overrides',
} as const;
