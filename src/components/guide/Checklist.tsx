'use client';

import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
}

interface ChecklistProps {
  items: ChecklistItem[];
  title?: string;
}

export function Checklist({ items, title = '체크리스트' }: ChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progress = items.length > 0 ? Math.round((checked.size / items.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className="text-xs text-text-tertiary">{progress}% 완료</span>
      </div>

      {/* 진행 바 */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const isDone = checked.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                  isDone ? 'bg-success/5' : 'hover:bg-surface-inset',
                )}
              >
                <CheckCircleIcon
                  className={cn(
                    'mt-0.5 h-5 w-5 shrink-0 transition-colors',
                    isDone ? 'text-success' : 'text-border',
                  )}
                />
                <div>
                  <span className={cn('text-sm', isDone && 'line-through text-text-tertiary')}>
                    {item.label}
                  </span>
                  {item.detail && (
                    <p className="mt-0.5 text-xs text-text-tertiary">{item.detail}</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
