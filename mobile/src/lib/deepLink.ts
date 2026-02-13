import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// ── Deep Link Scheme ─────────────────────────────────────
export const APP_SCHEME = 'ujuz';
export const WEB_URL = 'https://ujuz.kr';

// ── URL Builders (for web to generate app return URLs) ───

/**
 * Build a deep link URL for returning to the app after web payment.
 */
export function buildPaymentReturnUrl(sessionId: string): string {
  return Linking.createURL('subscription/success', {
    queryParams: { session_id: sessionId },
  });
}

/**
 * Build a web payment URL with app return parameters.
 * Opens in the device's browser for Toss Payments.
 */
export function buildWebPaymentUrl(planTier: string, billingCycle: string): string {
  const params = new URLSearchParams({
    plan: planTier,
    cycle: billingCycle,
    from: 'app',
  });
  return `${WEB_URL}/pricing?${params.toString()}`;
}

// ── Deep Link Handler ────────────────────────────────────

interface DeepLinkParams {
  path: string;
  params: Record<string, string>;
}

/**
 * Parse a deep link URL into path and parameters.
 */
export function parseDeepLink(url: string): DeepLinkParams | null {
  try {
    const parsed = Linking.parse(url);
    return {
      path: parsed.path ?? '',
      params: (parsed.queryParams ?? {}) as Record<string, string>,
    };
  } catch {
    return null;
  }
}

/**
 * Handle incoming deep link and navigate accordingly.
 */
export function handleDeepLink(url: string): void {
  const link = parseDeepLink(url);
  if (!link) return;

  const { path, params } = link;

  switch (path) {
    case 'subscription/success':
      // Payment completed, refresh subscription status
      router.push('/(tabs)/my');
      break;

    case 'to-alerts':
      // Navigate to alerts tab
      router.push('/(tabs)/alerts');
      break;

    case 'facility':
      // Navigate to map with facility focused
      if (params.id) {
        router.push({
          pathname: '/(tabs)/map',
          params: { facilityId: params.id },
        });
      }
      break;

    case 'chat':
      router.push('/(tabs)/chat');
      break;

    default:
      // Unknown path, go to home
      router.push('/(tabs)');
      break;
  }
}

// ── Payment Flow ─────────────────────────────────────────

/**
 * Open web payment page in browser.
 * Used from the mobile app to initiate Toss Payments via web.
 */
export async function openWebPayment(planTier: string, billingCycle: string): Promise<void> {
  const url = buildWebPaymentUrl(planTier, billingCycle);
  const supported = await Linking.canOpenURL(url);
  
  if (supported) {
    await Linking.openURL(url);
  }
}

// ── Universal Links Config Helper ────────────────────────

/**
 * Get the app's associated domains for Universal Links (iOS) / App Links (Android).
 * These should be configured in app.json and on the web server.
 */
export function getAssociatedDomains(): string[] {
  return [
    'applinks:ujuz.kr',
    'activitycontinuation:ujuz.kr',
  ];
}

