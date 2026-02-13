'use client';

import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FacilityCard } from '@/components/composites/FacilityCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Spinner } from '@/components/primitives/Spinner';
import { useFacilityBrowseStore } from '@/lib/store';
import { useApiFetch } from '@/lib/client/hooks/useApiFetch';
import { useInfiniteScroll } from '@/lib/client/hooks/useInfiniteScroll';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import type { Grade } from '@/lib/types';

interface FacilitySearchResult {
  facilities: Array<{
    _id: string;
    name: string;
    type: string;
    address?: { full?: string };
    grade?: Grade;
    score?: number;
    probability?: number;
  }>;
  has_more: boolean;
  cursor?: string;
}

export default function SearchPage() {
  const query = useFacilityBrowseStore((s) => s.query);
  const setQuery = useFacilityBrowseStore((s) => s.setQuery);
  const filters = useFacilityBrowseStore((s) => s.filters);
  const setFilter = useFacilityBrowseStore((s) => s.setFilter);
  const sort = useFacilityBrowseStore((s) => s.sort);
  const setSort = useFacilityBrowseStore((s) => s.setSort);

  const [cursor, setCursor] = useState<string | undefined>();
  const [allFacilities, setAllFacilities] = useState<FacilitySearchResult['facilities']>([]);

  const searchParams = new URLSearchParams();
  if (query) searchParams.set('name', query);
  if (filters.type) searchParams.set('type', filters.type);
  if (filters.sido) searchParams.set('sido', filters.sido);
  if (cursor) searchParams.set('cursor', cursor);
  searchParams.set('limit', '20');

  const apiPath = `/api/facilities/search?${searchParams.toString()}`;
  const { data, loading } = useApiFetch<FacilitySearchResult>(apiPath);

  const loadMore = useCallback(() => {
    if (data?.cursor) {
      setCursor(data.cursor);
      if (data.facilities) {
        setAllFacilities((prev) => [...prev, ...data.facilities]);
      }
    }
  }, [data]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: data?.has_more ?? false,
    loading,
  });

  const facilities = allFacilities.length > 0 ? allFacilities : (data?.facilities ?? []);

  return (
    <div className="flex flex-col">
      <PageHeader title="시설 검색" />

      <div className="space-y-4 p-4">
        {/* Search input */}
        <Input
          placeholder="어린이집 이름으로 검색..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(undefined);
            setAllFacilities([]);
          }}
          leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
        />

        {/* Filters */}
        <div className="flex gap-2">
          <Select
            options={[
              { value: '', label: '전체 유형' },
              { value: 'national_public', label: '국공립' },
              { value: 'private', label: '민간' },
              { value: 'home', label: '가정' },
              { value: 'workplace', label: '직장' },
            ]}
            value={filters.type ?? ''}
            onChange={(e) => setFilter('type', e.target.value || undefined)}
            className="flex-1"
          />
          <Select
            options={[
              { value: 'distance', label: '거리순' },
              { value: 'grade', label: '등급순' },
              { value: 'probability', label: '확률순' },
            ]}
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="flex-1"
          />
        </div>

        {/* Results */}
        {loading && facilities.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-28" />
            ))}
          </div>
        ) : facilities.length === 0 ? (
          <EmptyState
            icon={<FunnelIcon className="h-8 w-8" />}
            title="검색 결과가 없어요"
            description="다른 키워드나 필터로 다시 검색해 보세요"
          />
        ) : (
          <div className="space-y-3">
            {facilities.map((f) => (
              <FacilityCard
                key={f._id}
                id={f._id}
                name={f.name}
                type={f.type}
                address={f.address?.full}
                grade={f.grade}
                score={f.score}
                probability={f.probability}
              />
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && <Spinner size="sm" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
