'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RouteCard, RouteGrade } from '@/lib/types';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const GRADE_STYLES: Record<RouteGrade, { bg: string; text: string; label: string }> = {
  HIGH: { bg: 'bg-grade-a/10', text: 'text-grade-a', label: '추천' },
  MEDIUM: { bg: 'bg-grade-c/10', text: 'text-grade-c', label: '보통' },
  LOW: { bg: 'bg-grade-e/10', text: 'text-grade-e', label: '낮음' },
};

const ROUTE_LABELS: Record<string, string> = {
  public: '국공립 어린이집',
  workplace: '직장 어린이집',
  extended: '연장보육 어린이집',
};

interface RouteCardWidgetProps {
  route: RouteCard;
  isActive?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function RouteCardWidget({ route, isActive, onSelect, className }: RouteCardWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const gradeStyle = GRADE_STYLES[route.grade];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        isActive ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-border bg-surface',
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => {
          onSelect?.();
          setExpanded(!expanded);
        }}
      >
        <div className="flex items-center gap-3">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', gradeStyle.bg, gradeStyle.text)}>
            {gradeStyle.label}
          </span>
          <h3 className="text-sm font-semibold text-text-primary">
            {ROUTE_LABELS[route.route_id] ?? route.title}
          </h3>
        </div>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-text-tertiary transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {/* Reasons (always visible) */}
      <ul className="mt-3 space-y-1">
        {route.reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
            <span className={cn('mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full', gradeStyle.bg)} />
            {reason}
          </li>
        ))}
      </ul>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <p className="text-xs text-text-tertiary">
            추천 시설 {route.facility_ids.length}곳
          </p>
          {route.next_step && (
            <div className="mt-2 rounded-lg bg-surface-inset p-3">
              <p className="text-xs font-medium text-text-primary">{route.next_step.title}</p>
              <p className="mt-0.5 text-xs text-brand-600">{route.next_step.cta}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
