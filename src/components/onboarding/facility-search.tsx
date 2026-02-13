'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { apiFetch } from '@/lib/api';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FacilityResult {
  _id: string;
  name: string;
  address?: { full?: string };
}

export interface FacilitySearchProps {
  selected: { id: string; name: string }[];
  onAdd: (facility: { id: string; name: string }) => void;
  onRemove: (id: string) => void;
  onDone: () => void;
}

export function FacilitySearch({ selected, onAdd, onRemove, onDone }: FacilitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FacilityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Derive searching/results from debounced query
  const trimmedQuery = debouncedQuery.trim();

  useEffect(() => {
    if (!trimmedQuery) return;
    let cancelled = false;

    // Use rAF to set searching state asynchronously
    const id = requestAnimationFrame(() => {
      if (!cancelled) setSearching(true);
    });

    apiFetch<{ facilities: FacilityResult[] }>(
      `/api/v1/facilities?name=${encodeURIComponent(trimmedQuery)}&limit=10`,
    )
      .then((data) => { if (!cancelled) setResults(data.facilities ?? []); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [trimmedQuery]);

  // Clear results when query is empty (derived state, no effect needed)
  const effectiveResults = trimmedQuery ? results : [];

  return (
    <div className="space-y-4">
      <Input
        placeholder="시설명 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
      />

      {/* Selected */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((f) => (
            <span key={f.id} className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700">
              {f.name}
              <button type="button" onClick={() => onRemove(f.id)} aria-label={`${f.name} 시설 제거`}>
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {trimmedQuery && (
        <div aria-live="polite" className="space-y-1">
          <p className="sr-only">{effectiveResults.length}개 시설 검색됨</p>

          {effectiveResults.length > 0 && (
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {effectiveResults.map((f) => {
                const isSelected = selected.some((s) => s.id === f._id);
                return (
                  <button
                    key={f._id}
                    onClick={() => !isSelected && onAdd({ id: f._id, name: f.name })}
                    disabled={isSelected}
                    aria-disabled={isSelected ? 'true' : undefined}
                    className="w-full rounded-lg p-2 text-left hover:bg-surface-inset disabled:opacity-50"
                  >
                    <p className="text-sm font-medium text-text-primary">{f.name}</p>
                    {f.address?.full && <p className="text-xs text-text-tertiary">{f.address.full}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {searching && <p className="text-center text-xs text-text-tertiary">검색 중...</p>}

      <Button onClick={onDone} className="w-full" disabled={selected.length === 0}>
        {selected.length}개 시설 선택 완료
      </Button>
    </div>
  );
}
