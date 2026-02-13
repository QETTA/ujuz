'use client';

import { cn } from '@/lib/utils';
import type { ToAlertSubscription } from '@/lib/types';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { Chip } from '@/components/primitives/Chip';

interface AlertSubscriptionCardProps {
  subscription: ToAlertSubscription;
  onToggle?: () => void;
  onUnsubscribe?: () => void;
  className?: string;
}

export function AlertSubscriptionCard({
  subscription,
  onToggle,
  onUnsubscribe,
  className,
}: AlertSubscriptionCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {subscription.is_active ? (
            <BellIcon className="h-5 w-5 text-brand-600" />
          ) : (
            <BellSlashIcon className="h-5 w-5 text-text-tertiary" />
          )}
          <div>
            <p className="text-sm font-medium text-text-primary">{subscription.facility_name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {subscription.target_classes.map((cls) => (
                <Chip key={cls} variant="default">{cls}</Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={subscription.is_active ? '알림 일시중지' : '알림 재개'}
              className="rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-surface-inset transition-colors"
            >
              {subscription.is_active ? '일시중지' : '재개'}
            </button>
          )}
          {onUnsubscribe && (
            <button
              type="button"
              onClick={onUnsubscribe}
              aria-label={`${subscription.facility_name} 알림 삭제`}
              className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
