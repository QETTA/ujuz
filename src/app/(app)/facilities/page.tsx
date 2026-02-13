'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Input } from '@/components/ui/input';
import { FacilityList } from '@/components/facility/facility-list';
import { FilterSheet } from '@/components/sheets/filter-sheet';
import { useIntersection } from '@/lib/hooks/useIntersection';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useFacilityBrowseStore } from '@/lib/store';
import { apiFetch } from '@/lib/api';
import type { FacilityCardProps } from '@/components/facility/facility-card';
import { ROUTES } from '@/lib/platform/navigation';
import { AdjustmentsHorizontalIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ApiFacility {
  _id: string;
  provider_id?: string;
  name: string;
  type?: string;
  address?: { full?: string };
  capacity_total?: number;
}

export default function FacilitiesPage() {
  const router = useRouter();
  const { query, filters, setQuery, setFilter } = useFacilityBrowseStore();
  const debouncedQuery = useDebounce(query, 300);

  const [facilities, setFacilities] = useState<FacilityCardProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sentinelRef, isIntersecting] = useIntersection<HTMLDivElement>({ rootMargin: '200px' });

  const fetchFacilities = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedQuery) params.set('name', debouncedQuery);
    if (filters.type) params.set('type', filters.type);
    if (filters.sido) params.set('sido', filters.sido);
    if (!reset && cursor) params.set('cursor', cursor);
    params.set('limit', '20');

    try {
      const data = await apiFetch<{ facilities: ApiFacility[]; next_cursor?: string }>(
        `/api/v1/facilities?${params}`,
      );

      const mapped: FacilityCardProps[] = data.facilities.map((f) => ({
        id: f._id ?? f.provider_id ?? '',
        name: f.name,
        type: f.type,
        address: f.address?.full,
        onClick: () => router.push(ROUTES.FACILITY_DETAIL(f._id ?? f.provider_id ?? '')),
      }));

      setFacilities((prev) => reset ? mapped : [...prev, ...mapped]);
      setCursor(data.next_cursor ?? null);
      setHasMore(!!data.next_cursor);
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, cursor, loading, router]);

  // Reset on search/filter change
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    fetchFacilities(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filters.type, filters.sido]);

  // Infinite scroll
  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      fetchFacilities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIntersecting]);

  return (
    <div className="flex flex-col">
      <TopBar
        title="시설 탐색"
        action={
          <button
            onClick={() => setFilterOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-inset"
            aria-label="필터"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-md py-sm">
        <Input
          placeholder="시설명으로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
        />
      </div>

      <div className="px-md pb-md">
        <FacilityList facilities={facilities} loading={loading && facilities.length === 0} />
        {hasMore && <div ref={sentinelRef} className="h-1" />}
      </div>

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => {
          if (f.type !== undefined) setFilter('type', f.type);
          if (f.sido !== undefined) setFilter('sido', f.sido);
        }}
      />
    </div>
  );
}
