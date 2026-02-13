'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface EvidenceCardProps {
  type: string;
  summary: string;
  strength: number; // 0..1
  detail?: string;
  source?: string;
  className?: string;
}

const strengthLabel = (s: number) =>
  s >= 0.7 ? '강함' : s >= 0.3 ? '보통' : '약함';

const strengthColor = (s: number) =>
  s >= 0.7 ? 'bg-grade-a/15 text-grade-a' :
  s >= 0.3 ? 'bg-grade-c/15 text-grade-c' :
  'bg-grade-f/15 text-grade-f';

export function EvidenceCard({ type, summary, strength, detail, source, className }: EvidenceCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('rounded-xl border border-border p-sm', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', strengthColor(strength))}>
          {strengthLabel(strength)}
        </span>
        <span className="flex-1 text-sm font-medium text-text-primary">{summary}</span>
        <ChevronDownIcon
          className={cn('h-4 w-4 text-text-tertiary transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="mt-sm border-t border-border-subtle pt-sm text-xs text-text-secondary">
          {detail && <p>{detail}</p>}
          {source && <p className="mt-1 text-text-tertiary">출처: {source}</p>}
          <p className="mt-1 text-text-tertiary">유형: {type}</p>
        </div>
      )}
    </div>
  );
}
