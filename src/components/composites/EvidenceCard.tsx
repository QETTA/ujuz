import { cn } from '@/lib/utils';
import type { EvidenceCardModel } from '@/lib/types';
import {
  ChartBarIcon,
  UsersIcon,
  CalendarDaysIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const TYPE_META: Record<string, { icon: typeof ChartBarIcon; label: string }> = {
  TO_SNAPSHOT: { icon: ChartBarIcon, label: 'TO 현황' },
  COMMUNITY_AGGREGATE: { icon: UsersIcon, label: '커뮤니티 분석' },
  SEASONAL_FACTOR: { icon: CalendarDaysIcon, label: '시기별 변동' },
  SIMILAR_CASES: { icon: DocumentMagnifyingGlassIcon, label: '유사 사례' },
};

interface EvidenceCardProps {
  evidence: EvidenceCardModel;
  className?: string;
}

export function EvidenceCard({ evidence, className }: EvidenceCardProps) {
  const meta = TYPE_META[evidence.type] ?? TYPE_META.SIMILAR_CASES;
  const Icon = meta.icon;
  const strengthPct = Math.round(evidence.strength * 100);

  return (
    <div className={cn('flex items-start gap-3 rounded-lg bg-surface-elevated p-3', className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">{meta.label}</span>
          <span className="text-[10px] text-text-tertiary">신뢰도 {strengthPct}%</span>
        </div>
        <p className="mt-0.5 text-sm text-text-primary">{evidence.summary}</p>
        {evidence.source && (
          <p className="mt-1 text-[10px] text-text-tertiary">출처: {evidence.source}</p>
        )}
      </div>
    </div>
  );
}
