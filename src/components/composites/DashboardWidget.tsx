'use client';

import { cn } from '@/lib/utils';
import type { WidgetPayload, RouteId } from '@/lib/types';
import { WidgetSummaryBar } from './WidgetSummaryBar';
import { WeeklyActionCard } from './WeeklyActionCard';
import { RouteCardWidget } from './RouteCardWidget';
import EvidenceLabel from '@/components/data/EvidenceLabel';
import DisclaimerBanner from '@/components/data/DisclaimerBanner';

interface DashboardWidgetProps {
  widget: WidgetPayload;
  activeRoute: RouteId;
  onRouteSelect: (route: RouteId) => void;
  className?: string;
}

export function DashboardWidget({ widget, activeRoute, onRouteSelect, className }: DashboardWidgetProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary */}
      <WidgetSummaryBar summary={widget.summary} />
      <EvidenceLabel
        dataSource="공공데이터 (data.go.kr)"
        lastUpdated={widget.summary.updated_at}
      />

      {/* Weekly actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">이번 주 할 일</h2>
        <div className="grid gap-2">
          {widget.weekly_actions.map((action) => (
            <WeeklyActionCard key={action.key} action={action} />
          ))}
        </div>
      </section>

      {/* Routes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">입소 전략</h2>
        <div className="space-y-2">
          {widget.routes.map((route) => (
            <RouteCardWidget
              key={route.route_id}
              route={route}
              isActive={route.route_id === activeRoute}
              onSelect={() => onRouteSelect(route.route_id)}
            />
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <DisclaimerBanner variant="subtle" />
    </div>
  );
}
