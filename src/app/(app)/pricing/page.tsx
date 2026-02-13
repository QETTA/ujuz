'use client';

import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SubscriptionPlan } from '@/lib/types';

const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: '무료',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: '기본 기능 체험',
    features: [
      { label: '입소 확률 조회 1회/일', included: true },
      { label: 'TO 알림 1개 시설', included: true },
      { label: 'AI 상담 5회/일', included: true },
      { label: '전략 분석', included: false },
      { label: '광고 제거', included: false },
    ],
  },
  {
    id: 'basic',
    name: '베이직',
    priceMonthly: 5900,
    priceYearly: 59000,
    tagline: '핵심 기능 활용',
    highlight: true,
    features: [
      { label: '입소 확률 조회 15회/일', included: true },
      { label: 'TO 알림 5개 시설', included: true },
      { label: 'AI 상담 30회/일', included: true },
      { label: '전략 분석', included: true },
      { label: '광고 제거', included: false },
    ],
  },
  {
    id: 'premium',
    name: '프리미엄',
    priceMonthly: 9900,
    priceYearly: 99000,
    tagline: '모든 기능 무제한',
    features: [
      { label: '입소 확률 무제한', included: true },
      { label: 'TO 알림 무제한', included: true },
      { label: 'AI 상담 무제한', included: true },
      { label: '전략 분석 + 포트폴리오', included: true },
      { label: '광고 제거', included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col">
      <TopBar showBack title="요금제" />
      <div className="space-y-4 px-md py-md">
        {plans.map((plan, index) => (
          <Card
            key={plan.id}
            variant={plan.highlight ? 'elevated' : 'default'}
            className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${
              plan.highlight ? 'ring-2 ring-brand-500' : ''
            }`}
            style={{
              animationDelay: `${index * 120}ms`,
              animationFillMode: 'both',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                <p className="text-xs text-text-secondary">{plan.tagline}</p>
              </div>
              {plan.highlight && <Badge>추천</Badge>}
            </div>

            <div className="mt-3">
              <span className="text-2xl font-bold text-text-primary">
                {plan.priceMonthly === 0 ? '무료' : `${plan.priceMonthly.toLocaleString()}원`}
              </span>
              {plan.priceMonthly > 0 && <span className="text-sm text-text-tertiary">/월</span>}
            </div>

            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-sm">
                  {f.included ? (
                    <CheckIcon className="h-4 w-4 text-success" />
                  ) : (
                    <XMarkIcon className="h-4 w-4 text-text-tertiary" />
                  )}
                  <span className={f.included ? 'text-text-primary' : 'text-text-tertiary'}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.highlight ? 'primary' : 'secondary'}
              className="mt-4 w-full"
              size="sm"
            >
              {plan.priceMonthly === 0 ? '현재 플랜' : '선택'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
