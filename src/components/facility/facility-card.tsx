'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Grade } from '@/lib/types';

export interface FacilityCardProps {
  id: string;
  name: string;
  type?: string;
  address?: string;
  grade?: Grade;
  probability?: number;
  topFactor?: string;
  onClick?: () => void;
  className?: string;
}

export function FacilityCard({ name, type, address, grade, probability, topFactor, onClick, className }: FacilityCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border border-border bg-surface p-2 text-left transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
          {type && <p className="mt-0.5 text-xs text-text-tertiary">{type}</p>}
          {address && <p className="mt-0.5 truncate text-xs text-text-secondary">{address}</p>}
        </div>
        {grade && <Badge variant="grade" grade={grade} className="ml-2 shrink-0" />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {probability != null && (
          <span className="text-xs font-medium text-brand-600">
            확률 {Math.round(probability * 100)}%
          </span>
        )}
        {topFactor && (
          <span className="text-xs text-text-tertiary">{topFactor}</span>
        )}
      </div>
    </button>
  );
}
