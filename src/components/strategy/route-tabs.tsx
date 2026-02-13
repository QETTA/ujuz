'use client';

import { TabBar } from '@/components/nav/tab-bar';
import type { RouteId } from '@/lib/types';

const routeTabs = [
  { key: 'public', label: '국공립' },
  { key: 'workplace', label: '직장' },
  { key: 'extended', label: '연장' },
];

export interface RouteTabsProps {
  activeRoute: RouteId;
  onChange: (route: RouteId) => void;
}

export function RouteTabs({ activeRoute, onChange }: RouteTabsProps) {
  return (
    <TabBar
      tabs={routeTabs}
      activeTab={activeRoute}
      onChange={(key) => onChange(key as RouteId)}
    />
  );
}
