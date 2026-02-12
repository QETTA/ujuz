/**
 * UjuZ - Feature Flags
 * Simple constant-based feature flags. Can be migrated to DB/env later.
 */

export const FEATURE_FLAGS = {
  communityWrite: false,
  communityReport: true,
  aiExplain: true,
  facilityCrawl: true,
  facilityAdminApi: true,
  toDetection: true,
  toEmailNotification: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
