'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { AlertCard } from '@/components/composites/AlertCard';
import { AlertSubscriptionCard } from '@/components/composites/AlertSubscriptionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ChatError } from '@/components/ai/chat-error';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToAlertStore } from '@/lib/store';
import { BellIcon } from '@heroicons/react/24/outline';

export default function AlertsPage() {
  const subscriptions = useToAlertStore((s) => s.subscriptions);
  const history = useToAlertStore((s) => s.history);
  const loading = useToAlertStore((s) => s.loading);
  const error = useToAlertStore((s) => s.error);
  const load = useToAlertStore((s) => s.load);
  const loadHistory = useToAlertStore((s) => s.loadHistory);
  const unsubscribe = useToAlertStore((s) => s.unsubscribe);
  const markAsRead = useToAlertStore((s) => s.markAsRead);

  useEffect(() => {
    load();
    loadHistory();
  }, [load, loadHistory]);

  return (
    <div className="flex flex-col">
      <PageHeader title="TO 알림" />

      <div className="p-4">
        {error && (
          <ChatError message={error} onRetry={() => { load(); loadHistory(); }} className="mb-4" />
        )}
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">알림 내역</TabsTrigger>
            <TabsTrigger value="subscriptions">구독 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="card" className="h-24" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={<BellIcon className="h-8 w-8" />}
                title="아직 알림이 없어요"
                description="관심 시설에 TO 알림을 설정하면 여기서 확인할 수 있어요"
              />
            ) : (
              <div className="space-y-3">
                {history.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onMarkRead={
                      !alert.is_read ? () => markAsRead([alert.id]) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions">
            {subscriptions.length === 0 ? (
              <EmptyState
                icon={<BellIcon className="h-8 w-8" />}
                title="구독 중인 시설이 없어요"
                description="시설 상세 페이지에서 TO 알림을 설정해보세요"
              />
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <AlertSubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onUnsubscribe={() => unsubscribe(sub.facility_id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
