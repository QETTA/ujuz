'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { FacilityCard, type FacilityCardProps } from './facility-card';

export interface FacilityListProps {
  facilities: FacilityCardProps[];
  loading?: boolean;
  loadingCount?: number;
}

export function FacilityList({ facilities, loading, loadingCount = 3 }: FacilityListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-24" />
        ))}
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-tertiary">검색 결과가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {facilities.map((f) => (
        <FacilityCard key={f.id} {...f} />
      ))}
    </div>
  );
}
