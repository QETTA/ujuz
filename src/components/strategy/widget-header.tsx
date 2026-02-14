import { cn } from '@/lib/utils';
import type { WidgetSummary } from '@/lib/types';

export interface WidgetHeaderProps {
  summary: WidgetSummary;
  className?: string;
}

const gradeColor: Record<string, string> = {
  HIGH: 'text-grade-a',
  MEDIUM: 'text-grade-c',
  LOW: 'text-grade-f',
};

export function WidgetHeader({ summary, className }: WidgetHeaderProps) {
  return (
    <div className={cn('rounded-xl bg-surface-elevated p-4', className)}>
      <div className="flex items-center gap-3">
        <span className={cn('text-3xl font-bold', gradeColor[summary.overall_grade])}>
          {summary.overall_grade}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{summary.one_liner}</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            신뢰도: {summary.confidence} · {summary.updated_at}
          </p>
        </div>
      </div>
    </div>
  );
}
