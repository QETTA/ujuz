export const COLLECTIONS = {
  anonymousSessions: 'anonymous_sessions',
  admissionRequests: 'admission_requests',
  toAlerts: 'to_alerts',
  posts: 'posts',
  reportsModeration: 'reports_moderation',
  usageCounters: 'usage_counters',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
