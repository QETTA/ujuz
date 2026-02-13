import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/platform/navigation';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/primitives/Chip';
import type { Grade } from '@/lib/types';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface FacilityCardProps {
  id: string;
  name: string;
  type: string;
  address?: string;
  grade?: Grade;
  score?: number;
  probability?: number;
  chips?: string[];
  className?: string;
}

export function FacilityCard({
  id,
  name,
  type,
  address,
  grade,
  score,
  probability,
  chips,
  className,
}: FacilityCardProps) {
  return (
    <Link
      href={ROUTES.FACILITY_DETAIL(id)}
      className={cn(
        'block rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-sm hover:border-brand-200',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">{name}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{type}</p>
        </div>
        {grade && <Badge variant="grade" grade={grade}>{grade}</Badge>}
      </div>

      {address && (
        <div className="mt-2 flex items-center gap-1 text-xs text-text-tertiary">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {score != null && (
          <Chip variant="brand">점수 {score}</Chip>
        )}
        {probability != null && (
          <Chip variant="success">확률 {(probability * 100).toFixed(0)}%</Chip>
        )}
        {chips?.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
    </Link>
  );
}
