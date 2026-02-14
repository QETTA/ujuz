'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PlanFeature {
  label: string;
  included: boolean;
}

interface PlanDisplay {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  tagline: string;
  highlight: boolean;
  features: PlanFeature[];
}

interface PlansResponse {
  plans?: PlanDisplay[];
}

interface CurrentSubscriptionResponse {
  plan?: {
    id?: string;
    tier?: string;
  };
}

type BillingCycle = 'monthly' | 'yearly';

const normalizePlanId = (value: string) => value.trim().toLowerCase();

const formatPrice = (value: number) =>
  new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);

const pricingCycleButtonClass = (active: boolean) =>
  active ? 'bg-brand-500 text-text-inverse' : 'bg-surface-elevated text-text-secondary hover:bg-surface-inset';

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromApp = searchParams.get('from') === 'app';

  const [plans, setPlans] = useState<PlanDisplay[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        const [plansResponse, subscriptionResponse] = await Promise.all([
          fetch('/api/v1/subscription?action=plans', { cache: 'no-store' }),
          fetch('/api/v1/subscription', { cache: 'no-store' }).catch(() => null),
        ]);

        const plansPayload: PlansResponse = plansResponse.ok
          ? await plansResponse.json()
          : { plans: [] };

        let subscriptionPayload: CurrentSubscriptionResponse | null = null;
        if (subscriptionResponse && subscriptionResponse.ok) {
          subscriptionPayload = await subscriptionResponse.json();
        }

        if (canceled) return;

        setPlans(Array.isArray(plansPayload.plans) ? plansPayload.plans : []);

        const incomingPlan =
          subscriptionPayload?.plan?.tier ?? subscriptionPayload?.plan?.id;
        if (incomingPlan) {
          setCurrentPlan(normalizePlanId(incomingPlan));
        }
      } catch {
        if (!canceled) {
          setError('요금제 정보를 불러오지 못했습니다.');
          setPlans([]);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

  const handleSelect = (planId: string) => {
    const normalized = normalizePlanId(planId);
    if (normalized === 'free' || normalized === currentPlan) return;

    router.push(`/subscription?plan=${encodeURIComponent(planId)}&cycle=${billingCycle}`);
  };

  const handleBackToApp = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  };

  const renderSkeletonCards = () => (
    <div className="grid gap-6 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card
          key={`plan-skeleton-${idx}`}
          className="rounded-2xl border-border bg-surface p-6"
        >
          <div className="mb-5 h-6 w-20 animate-pulse rounded-full bg-surface-inset" />
          <div className="mb-3 h-9 w-1/2 animate-pulse rounded bg-surface-inset" />
          <div className="mb-8 h-4 w-full animate-pulse rounded bg-surface-inset" />
          <div className="space-y-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-surface-inset" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-surface-inset" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-inset" />
            <div className="h-4 w-9/12 animate-pulse rounded bg-surface-inset" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-surface-inset" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <TopBar />

      {fromApp && (
        <Card className="rounded-2xl border-border bg-surface px-6 py-5">
          <p className="mb-3 text-sm font-medium text-text-secondary">
            앱에서 결제 후 자동으로 구독이 활성화됩니다.
          </p>
          <Button onClick={handleBackToApp} type="button">
            앱으로 돌아가기
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">요금제 선택</h1>
        <div className="inline-flex rounded-xl border border-border p-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${pricingCycleButtonClass(
              billingCycle === 'monthly',
            )}`}
          >
            월간
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${pricingCycleButtonClass(
              billingCycle === 'yearly',
            )}`}
          >
            연간
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {loading ? (
        renderSkeletonCards()
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = normalizePlanId(plan.id) === currentPlan;
            const isFreePlan = normalizePlanId(plan.id) === 'free';
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            const monthlyFromYearly =
              billingCycle === 'yearly' && plan.priceYearly > 0
                ? Math.round(plan.priceYearly / 12)
                : null;

            return (
              <Card
                key={plan.id}
                className={`relative rounded-2xl border-border p-6 ${
                  plan.highlight ? 'border-brand-500 shadow-lg' : ''
                }`}
              >
                {isCurrentPlan ? (
                  <Badge className="absolute right-4 top-4 bg-brand-500 text-text-inverse">
                    현재 플랜
                  </Badge>
                ) : null}

                {plan.highlight ? (
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600">
                    추천
                  </p>
                ) : null}

                <h2 className="text-xl font-bold text-text-primary">{plan.name}</h2>
                <p className="mt-2 text-sm text-text-secondary">{plan.tagline}</p>

                <p className="mt-6 text-4xl font-black text-text-primary">
                  {formatPrice(price)}
                  <span className="text-base font-semibold text-text-secondary">
                    {billingCycle === 'monthly' ? ' /월' : ' /년'}
                  </span>
                </p>
                {monthlyFromYearly ? (
                  <p className="mt-1 text-xs text-text-secondary">월 약 {formatPrice(monthlyFromYearly)}</p>
                ) : null}

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <XMarkIcon className="mt-0.5 h-5 w-5 shrink-0 text-text-tertiary" />
                      )}
                      <span
                        className={feature.included ? 'text-text-primary' : 'text-text-tertiary'}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  className="mt-6 w-full"
                  onClick={() => handleSelect(plan.id)}
                  disabled={isCurrentPlan || isFreePlan}
                  variant={isCurrentPlan || isFreePlan ? 'secondary' : 'primary'}
                >
                  {isCurrentPlan
                    ? '현재 플랜'
                    : isFreePlan
                      ? '현재 무료 요금제'
                      : '선택하기'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
