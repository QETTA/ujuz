'use client';

import { cn } from '@/lib/utils';
import type { ChecklistItem } from '@/lib/types';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { CircleStackIcon } from '@heroicons/react/24/outline';

interface ChecklistPanelProps {
  items: ChecklistItem[];
  onToggle: (key: string, done: boolean) => void;
  className?: string;
}

export function ChecklistPanel({ items, onToggle, className }: ChecklistPanelProps) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">진행률</span>
          <span className="text-text-secondary">{completed}/{total}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-surface-inset">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-normal"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key, !item.done)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
              item.done
                ? 'border-success/20 bg-success/5'
                : 'border-border bg-surface hover:bg-surface-inset',
            )}
          >
            {item.done ? (
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <CircleStackIcon className="h-5 w-5 shrink-0 text-text-tertiary" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  item.done ? 'text-text-tertiary line-through' : 'text-text-primary',
                )}
              >
                {item.title}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">{item.reason}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
