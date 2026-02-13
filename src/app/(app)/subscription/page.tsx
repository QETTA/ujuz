'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { PricingCard } from '@/components/composites/PricingCard';
import { Toggle } from '@/components/ui/toggle';
import { useSubscription } from '@/lib/client/hooks/useSubscription';
import { clientApiFetch } from '@/lib/client/api';
import { useToast } from '@/components/ui/toast';
import type { SubscriptionPlan } from '@/lib/types';

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: '무료',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: '기본 기능 체험',
    features: [
      { label: '입소 확률 계산 (3회/일)', included: true },
      { label: 'TO 알림 1개 시설', included: true },
      { label: 'AI 상담 10회/일', included: true },
      { label: '커뮤니티 열람', included: true },
      { label: '전략 분석', included: false },
      { label: '우선 알림', included: false },
    ],
  },
  {
    id: 'basic',
    name: '베이직',
    priceMonthly: 4900,
    priceYearly: 39000,
    tagline: '본격적인 입소 준비',
    features: [
      { label: '입소 확률 무제한', included: true },
      { label: 'TO 알림 5개 시설', included: true },
      { label: 'AI 상담 무제한', included: true },
      { label: '커뮤니티 작성', included: true },
      { label: '전략 분석', included: true },
      { label: '우선 알림', included: false },
    ],
  },
  {
    id: 'premium',
    name: '프리미엄',
    priceMonthly: 9900,
    priceYearly: 79000,
    tagline: '입소 성공을 위한 올인원',
    highlight: true,
    features: [
      { label: '입소 확률 무제한', included: true },
      { label: 'TO 알림 무제한', included: true },
      { label: 'AI 상담 무제한 + 심화', included: true },
      { label: '커뮤니티 전체', included: true },
      { label: '전략 분석 + 포트폴리오', included: true },
      { label: '우선 알림 (1분 빠른)', included: true },
    ],
  },
];

export default function SubscriptionPage() {
  const { subscription, refetch } = useSubscription();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelect = async (planId: string) => {
    try {
      await clientApiFetch('/api/user/account', {
        method: 'POST',
        json: {
          plan_tier: planId,
          billing_cycle: billingCycle,
        },
      });
      refetch();
      toast('플랜이 변경되었습니다', 'success');
    } catch {
      toast('플랜 변경에 실패했습니다', 'error');
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="구독 플랜" />

      <div className="space-y-6 p-4">
        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm text-text-secondary">월간</span>
          <Toggle
            pressed={billingCycle === 'yearly'}
            onPressedChange={(pressed) => setBillingCycle(pressed ? 'yearly' : 'monthly')}
            size="sm"
          >
            {billingCycle === 'yearly' ? '연간 (20% 할인)' : '월간'}
          </Toggle>
          <span className="text-sm text-text-secondary">연간</span>
        </div>

        {/* Plans */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              isCurrentPlan={subscription.plan_tier === plan.id}
              onSelect={() => handleSelect(plan.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
