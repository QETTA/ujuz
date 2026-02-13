import { cn } from '@/lib/utils';
import type { WidgetSummary, RouteGrade } from '@/lib/types';

const GRADE_STYLES: Record<RouteGrade, { bg: string; text: string }> = {
  HIGH: { bg: 'bg-grade-a/10', text: 'text-grade-a' },
  MEDIUM: { bg: 'bg-grade-c/10', text: 'text-grade-c' },
  LOW: { bg: 'bg-grade-e/10', text: 'text-grade-e' },
};

interface WidgetSummaryBarProps {
  summary: WidgetSummary;
  className?: string;
}

export function WidgetSummaryBar({ summary, className }: WidgetSummaryBarProps) {
  const gradeStyle = GRADE_STYLES[summary.overall_grade];

  return (
    <div className={cn('rounded-xl bg-surface-elevated p-4', className)}>
      <div className="flex items-center gap-2">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', gradeStyle.bg, gradeStyle.text)}>
          {summary.overall_grade}
        </span>
        <p className="text-sm font-medium text-text-primary">{summary.one_liner}</p>
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        마지막 업데이트: {summary.updated_at}
      </p>
    </div>
  );
}
