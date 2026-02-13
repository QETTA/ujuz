import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Grade } from '@/lib/types';

export interface FacilityDetailHeaderProps {
  name: string;
  type?: string;
  address?: string;
  distanceKm?: number;
  grade?: Grade;
  className?: string;
}

export function FacilityDetailHeader({ name, type, address, distanceKm, grade, className }: FacilityDetailHeaderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold text-text-primary">{name}</h1>
        {grade && <Badge variant="grade" grade={grade} />}
      </div>
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        {type && <span>{type}</span>}
        {distanceKm != null && <span>· {distanceKm.toFixed(1)}km</span>}
      </div>
      {address && <p className="text-xs text-text-tertiary">{address}</p>}
    </div>
  );
}
