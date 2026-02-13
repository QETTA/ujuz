'use client';

import { useApiFetch } from './useApiFetch';

interface SubscriptionState {
  plan_tier: 'free' | 'basic' | 'premium';
  active: boolean;
  expires_at?: string;
  limits: {
    score_queries_per_day: number;
    alert_subscriptions: number;
    chat_messages_per_day: number;
  };
}

const FREE_LIMITS: SubscriptionState = {
  plan_tier: 'free',
  active: true,
  limits: {
    score_queries_per_day: 3,
    alert_subscriptions: 1,
    chat_messages_per_day: 10,
  },
};

export function useSubscription() {
  const { data, loading, error, refetch } = useApiFetch<SubscriptionState>('/api/user/account');
  const subscription = data ?? FREE_LIMITS;

  const canUseFeature = (_feature: 'score' | 'alerts' | 'chat'): boolean => {
    if (subscription.plan_tier === 'premium') return true;
    // Basic & free have limits; actual enforcement is server-side
    return subscription.active;
  };

  return {
    subscription,
    loading,
    error,
    refetch,
    canUseFeature,
    isPremium: subscription.plan_tier === 'premium',
    isFree: subscription.plan_tier === 'free',
  };
}
