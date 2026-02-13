'use client';

import { cn } from '@/lib/utils';

export interface ProbabilityBarProps {
  value: number; // 0-100
  label?: string;
  className?: string;
}

export function ProbabilityBar({ value, label, className }: ProbabilityBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  const colorClass =
    clamped >= 70 ? 'bg-grade-a' :
    clamped >= 50 ? 'bg-grade-c' :
    clamped >= 30 ? 'bg-grade-d' :
    'bg-grade-f';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{label}</span>
          <span className="font-medium text-text-primary">{clamped}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-inset"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `확률 ${clamped}%`}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-smooth', colorClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
