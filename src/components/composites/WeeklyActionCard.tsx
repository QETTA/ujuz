import { cn } from '@/lib/utils';
import type { WeeklyAction } from '@/lib/types';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface WeeklyActionCardProps {
  action: WeeklyAction;
  className?: string;
}

export function WeeklyActionCard({ action, className }: WeeklyActionCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-surface-inset',
        action.priority === 'HIGH' ? 'border-brand-200 bg-brand-50' : 'border-border bg-surface',
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{action.title}</p>
        <p className="text-xs text-brand-600">{action.cta}</p>
      </div>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
    </div>
  );
}
