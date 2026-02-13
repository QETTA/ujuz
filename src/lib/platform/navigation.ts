/**
 * UJUz — Route Constants
 *
 * Single source of truth for all client-side navigation paths.
 * Web: string constants used in next/link href and router.push()
 * React Native (future): mapped to Expo Router paths
 */

export const ROUTES = {
  HOME: '/dashboard',
  SEARCH: '/search',
  CHAT: '/chat',
  ALERTS: '/alerts',
  PROFILE: '/profile',
  FACILITIES: '/facilities',
  FACILITY_DETAIL: (id: string) => `/facilities/${id}` as const,
  SCORE: '/score',
  COMMUNITY: '/community',
  SUBSCRIPTION: '/subscription',
  CHECKLIST: '/checklist',
  AI: '/ai',
  MY: '/my',
  MY_SETTINGS: '/my/settings',
  PRICING: '/pricing',
  ONBOARDING: '/onboarding',
  ONBOARDING_CONSENT: '/onboarding/consent',
  ONBOARDING_FACILITIES: '/onboarding/facilities',
  ONBOARDING_COMPLETE: '/onboarding/complete',
  LOGIN: '/login',
  LANDING: '/',
} as const;
