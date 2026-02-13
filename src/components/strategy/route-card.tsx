import { cn } from '@/lib/utils';
import type { RouteCard as RouteCardType } from '@/lib/types';
import { Card } from '@/components/ui/card';

export interface RouteCardProps {
  route: RouteCardType;
  active?: boolean;
  onClick?: () => void;
}

const gradeColor: Record<string, string> = {
  HIGH: 'bg-grade-a/15 text-grade-a',
  MEDIUM: 'bg-grade-c/15 text-grade-c',
  LOW: 'bg-grade-f/15 text-grade-f',
};

export function RouteCard({ route, active, onClick }: RouteCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <Card
      variant={active ? 'elevated' : 'default'}
      className={cn('cursor-pointer transition-shadow', active && 'ring-2 ring-brand-500')}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      aria-pressed={active}
      tabIndex={0}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{route.title}</h3>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', gradeColor[route.grade])}>
          {route.grade}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {route.reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-text-secondary">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
            {reason}
          </li>
        ))}
      </ul>
      {route.next_step && (
        <div className="mt-3 border-t border-border-subtle pt-2">
          <p className="text-xs font-medium text-brand-600">{route.next_step.cta}</p>
        </div>
      )}
    </Card>
  );
}
