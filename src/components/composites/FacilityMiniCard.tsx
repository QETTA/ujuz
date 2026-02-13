import { cn } from '@/lib/utils';
import type { StrategyFacility } from '@/lib/types';
import { Chip } from '@/components/primitives/Chip';

interface FacilityMiniCardProps {
  facility: StrategyFacility;
  onClick?: () => void;
  className?: string;
}

export function FacilityMiniCard({ facility, onClick, className }: FacilityMiniCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-inset',
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{facility.name}</p>
        <p className="text-xs text-text-tertiary">{facility.type}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        {facility.chips.slice(0, 2).map((chip) => (
          <Chip key={chip} variant="brand">{chip}</Chip>
        ))}
      </div>
    </button>
  );
}
