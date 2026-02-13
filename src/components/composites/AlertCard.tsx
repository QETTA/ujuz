'use client';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { ToAlertHistory } from '@/lib/types';
import { BellAlertIcon } from '@heroicons/react/24/solid';

interface AlertCardProps {
  alert: ToAlertHistory;
  onMarkRead?: () => void;
  className?: string;
}

export function AlertCard({ alert, onMarkRead, className }: AlertCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 transition-colors',
        alert.is_read
          ? 'border-border bg-surface'
          : 'border-brand-200 bg-brand-50',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          alert.is_read ? 'bg-surface-inset text-text-tertiary' : 'bg-brand-100 text-brand-600',
        )}
      >
        <BellAlertIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">{alert.facility_name}</p>
          {!alert.is_read && onMarkRead && (
            <button
              type="button"
              onClick={onMarkRead}
              className="shrink-0 text-xs text-brand-600 hover:underline"
            >
              읽음
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">
          {alert.age_class} · 예상 {alert.estimated_slots}석
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-text-tertiary">
          <span>신뢰도 {(alert.confidence * 100).toFixed(0)}%</span>
          <span>·</span>
          <span>{formatRelativeTime(alert.detected_at)}</span>
        </div>
      </div>
    </div>
  );
}
