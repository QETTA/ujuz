'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { DashboardWidget } from '@/components/composites/DashboardWidget';
import { RecommendationForm } from '@/components/composites/RecommendationForm';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ChatError } from '@/components/ai/chat-error';
import { useStrategyStore, useHomeStore } from '@/lib/store';
import { useUnreadAlerts } from '@/lib/client/hooks/useUnreadAlerts';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const recommendation = useStrategyStore((s) => s.recommendation);
  const activeRoute = useStrategyStore((s) => s.activeRoute);
  const setActiveRoute = useStrategyStore((s) => s.setActiveRoute);
  const loading = useStrategyStore((s) => s.loading);
  const error = useStrategyStore((s) => s.error);
  const loadHome = useHomeStore((s) => s.load);

  // Start polling unread alerts
  useUnreadAlerts();

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  return (
    <div className="flex flex-col">
      <PageHeader title="홈" subtitle="우주지 대시보드" />

      <div className="space-y-6 p-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton variant="card" />
            <Skeleton variant="rectangular" />
            <Skeleton variant="rectangular" />
          </div>
        ) : error ? (
          <ChatError
            message={error}
            onRetry={loadHome}
          />
        ) : recommendation ? (
          <DashboardWidget
            widget={recommendation.widget}
            activeRoute={activeRoute}
            onRouteSelect={setActiveRoute}
          />
        ) : (
          <div className="space-y-6">
            <EmptyState
              icon={<SparklesIcon className="h-8 w-8" />}
              title="아직 분석 결과가 없어요"
              description="아이 정보를 입력하면 AI가 맞춤 입소 전략을 분석해드려요"
            />
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-base font-semibold text-text-primary">빠른 분석</h2>
              <RecommendationForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
