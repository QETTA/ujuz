import { cn } from '@/lib/utils';

export interface DataBlockCardProps {
  type: string;
  title: string;
  content: string;
  confidence: number;
  source?: string;
  className?: string;
}

export function DataBlockCard({ title, content, confidence, source, className }: DataBlockCardProps) {
  const confidenceLabel = confidence >= 0.8 ? '높음' : confidence >= 0.5 ? '보통' : '낮음';

  return (
    <div className={cn('rounded-xl border border-border bg-surface-elevated p-sm', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary">{title}</h4>
        <span className="text-[10px] text-text-tertiary">신뢰도: {confidenceLabel}</span>
      </div>
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">{content}</p>
      {source && <p className="mt-1 text-[10px] text-text-tertiary">출처: {source}</p>}
    </div>
  );
}
