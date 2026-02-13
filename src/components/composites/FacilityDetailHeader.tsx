import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Grade } from '@/lib/types';
import { MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface FacilityDetailHeaderProps {
  name: string;
  type: string;
  address?: string;
  phone?: string;
  grade?: Grade;
  score?: number;
  className?: string;
}

export function FacilityDetailHeader({
  name,
  type,
  address,
  phone,
  grade,
  score,
  className,
}: FacilityDetailHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{name}</h1>
          <p className="text-sm text-text-secondary">{type}</p>
        </div>
        {grade && (
          <div className="flex flex-col items-end gap-1">
            <Badge variant="grade" grade={grade} className="text-sm px-3 py-1">{grade}</Badge>
            {score != null && (
              <span className="text-xs text-text-tertiary">점수 {score}</span>
            )}
          </div>
        )}
      </div>

      {address && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <MapPinIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
          <span>{address}</span>
        </div>
      )}

      {phone && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <PhoneIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
          <a href={`tel:${phone}`} className="text-brand-600 hover:underline">{phone}</a>
        </div>
      )}
    </div>
  );
}
