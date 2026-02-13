import { cn } from '@/lib/utils';

export interface StatRowProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatRow({ label, value, trend, className }: StatRowProps) {
  const arrow = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '';
  const trendColor = trend === 'up' ? 'text-grade-a' : trend === 'down' ? 'text-grade-f' : '';

  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="flex items-center gap-1 text-sm font-medium text-text-primary">
        {value}
        {arrow && <span className={cn('text-xs', trendColor)}>{arrow}</span>}
      </span>
    </div>
  );
}
