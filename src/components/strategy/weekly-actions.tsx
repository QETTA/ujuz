import { cn } from '@/lib/utils';
import type { WeeklyAction } from '@/lib/types';

export interface WeeklyActionsProps {
  actions: WeeklyAction[];
  className?: string;
}

const priorityStyle: Record<string, string> = {
  HIGH: 'border-l-brand-500',
  MEDIUM: 'border-l-border',
};

export function WeeklyActions({ actions, className }: WeeklyActionsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-sm font-semibold text-text-primary">이번 주 행동</h3>
      {actions.map((action) => (
        <div
          key={action.key}
          className={cn('rounded-lg border-l-4 bg-surface-elevated p-sm', priorityStyle[action.priority])}
        >
          <p className="text-sm font-medium text-text-primary">{action.title}</p>
          <p className="mt-0.5 text-xs text-brand-600">{action.cta}</p>
        </div>
      ))}
    </div>
  );
}
