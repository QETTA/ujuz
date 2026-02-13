'use client';

import { PageHeader } from '@/components/layouts/PageHeader';
import { ChecklistPanel } from '@/components/composites/ChecklistPanel';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiFetch } from '@/lib/client/hooks/useApiFetch';
import { clientApiFetch } from '@/lib/client/api';
import { useStrategyStore } from '@/lib/store';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import type { ChecklistItem } from '@/lib/types';

interface ChecklistResponse {
  items: ChecklistItem[];
  recommendation_id: string;
}

export default function ChecklistPage() {
  const recommendation = useStrategyStore((s) => s.recommendation);
  const recId = recommendation?.recommendation_id;

  const { data, loading, refetch } = useApiFetch<ChecklistResponse>(
    recId ? `/api/v1/checklist?recommendation_id=${recId}` : null,
  );

  const handleToggle = async (key: string, done: boolean) => {
    if (!recId) return;
    try {
      await clientApiFetch('/api/v1/checklist', {
        method: 'PATCH',
        json: { recommendation_id: recId, item_key: key, done },
      });
      refetch();
    } catch {
      // Error handled by clientApiFetch
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="체크리스트" />

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-16" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardDocumentCheckIcon className="h-8 w-8" />}
            title="체크리스트가 없어요"
            description="먼저 AI 전략 분석을 실행하면 맞춤 체크리스트가 생성됩니다"
          />
        ) : (
          <ChecklistPanel items={data.items} onToggle={handleToggle} />
        )}
      </div>
    </div>
  );
}
