import { cn } from '@/lib/utils';
import { formatKoreanNumber } from '@/lib/utils';
import type { SubscriptionPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PricingCardProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  isCurrentPlan?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function PricingCard({
  plan,
  billingCycle,
  isCurrentPlan,
  onSelect,
  className,
}: PricingCardProps) {
  const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6',
        plan.highlight
          ? 'border-brand-500 bg-brand-50 shadow-md'
          : 'border-border bg-surface',
        className,
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-text-inverse">
          추천
        </span>
      )}

      <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
      <p className="mt-1 text-xs text-text-secondary">{plan.tagline}</p>

      <div className="mt-4">
        {price === 0 ? (
          <p className="text-3xl font-bold text-text-primary">무료</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-text-primary">
              {formatKoreanNumber(monthlyEquivalent)}
              <span className="text-sm font-normal text-text-tertiary">/월</span>
            </p>
            {billingCycle === 'yearly' && (
              <p className="mt-0.5 text-xs text-text-tertiary">
                연 {formatKoreanNumber(price)} 결제
              </p>
            )}
          </>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature.label} className="flex items-center gap-2 text-sm">
            {feature.included ? (
              <CheckIcon className="h-4 w-4 text-success" />
            ) : (
              <XMarkIcon className="h-4 w-4 text-text-tertiary" />
            )}
            <span className={feature.included ? 'text-text-primary' : 'text-text-tertiary'}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant={plan.highlight ? 'primary' : 'secondary'}
        className="mt-6 w-full"
        onClick={onSelect}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan ? '현재 플랜' : '선택하기'}
      </Button>
    </div>
  );
}
