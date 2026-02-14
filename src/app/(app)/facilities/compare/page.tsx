'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Address = {
  full?: string;
  sido?: string;
  sigungu?: string;
  detail?: string;
};

type OperatingHours = {
  weekday?: string;
  saturday?: string;
  sunday?: string;
};

type FacilityApiResponse = {
  id?: string;
  _id?: string;
  name?: string;
  type?: string;
  capacity_total?: number;
  capacity_current?: number;
  extended_care?: boolean;
  address?: Address | string;
  operating_hours?: OperatingHours;
};

type FacilityRow = {
  id: string;
  label: string;
  type: string;
  capacityTotal?: number;
  capacityCurrent?: number;
  extendedCare?: boolean;
  addressText: string;
  operatingHoursText: string;
  utilizationRate?: number;
};

type RowKey = 'name' | 'type' | 'capacity' | 'current' | 'extended' | 'hours' | 'address';

type RowDef = {
  key: RowKey;
  label: string;
  formatter: (facility: FacilityRow) => string;
};

const compareRows: RowDef[] = [
  {
    key: 'name',
    label: '시설명',
    formatter: (facility) => facility.label || '이름 미제공',
  },
  {
    key: 'type',
    label: '유형',
    formatter: (facility) => facility.type || '유형 미제공',
  },
  {
    key: 'capacity',
    label: '정원',
    formatter: (facility) => (facility.capacityTotal != null ? `${facility.capacityTotal}명` : '정보 없음'),
  },
  {
    key: 'current',
    label: '현원',
    formatter: (facility) => facility.capacityCurrent != null ? `${facility.capacityCurrent}명` : '정보 없음',
  },
  {
    key: 'extended',
    label: '연장보육',
    formatter: (facility) => (facility.extendedCare == null ? '정보 없음' : facility.extendedCare ? '운영' : '미운영'),
  },
  {
    key: 'hours',
    label: '운영시간',
    formatter: (facility) => facility.operatingHoursText,
  },
  {
    key: 'address',
    label: '주소',
    formatter: (facility) => facility.addressText,
  },
];

const compareLimit = 3;

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  const split = raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, compareLimit);

  return [...new Set(split)];
}

function formatAddress(address: Address | string | undefined): string {
  if (!address) return '주소 정보 없음';
  if (typeof address === 'string') return address;
  if (address.full) return address.full;
  return [address.sido, address.sigungu, address.detail].filter(Boolean).join(' ') || '주소 정보 없음';
}

function formatOperatingHours(hours: OperatingHours | undefined): string {
  if (!hours) return '정보 없음';
  const entries: string[] = [];
  if (hours.weekday) entries.push(`평일 ${hours.weekday}`);
  if (hours.saturday) entries.push(`토요일 ${hours.saturday}`);
  if (hours.sunday) entries.push(`일요일 ${hours.sunday}`);
  return entries.length > 0 ? entries.join(' · ') : '정보 없음';
}

function normalizeFacility(data: FacilityApiResponse, fallbackId: string): FacilityRow {
  const capacityTotal =
    typeof data.capacity_total === 'number' && Number.isFinite(data.capacity_total)
      ? data.capacity_total
      : undefined;
  const capacityCurrent =
    typeof data.capacity_current === 'number' && Number.isFinite(data.capacity_current)
      ? data.capacity_current
      : undefined;

  const utilizationRate =
    capacityTotal && capacityCurrent != null ? capacityCurrent / capacityTotal : undefined;

  return {
    id: data.id ?? fallbackId,
    label: data.name ?? '이름 미제공',
    type: data.type ?? '미제공',
    capacityTotal,
    capacityCurrent,
    extendedCare: data.extended_care,
    addressText: formatAddress(data.address),
    operatingHoursText: formatOperatingHours(data.operating_hours),
    utilizationRate,
  };
}

function getBestValueIndices(
  facilities: FacilityRow[],
  key: RowKey,
): Set<number> {
  const indices = new Set<number>();

  if (key === 'capacity') {
    const values = facilities
      .map((facility, index) => ({ index, value: facility.capacityTotal }))
      .filter((entry): entry is { index: number; value: number } =>
        typeof entry.value === 'number' && Number.isFinite(entry.value),
      );
    if (!values.length) return indices;
    const max = Math.max(...values.map((entry) => entry.value));
    values.filter((entry) => entry.value === max).forEach((entry) => indices.add(entry.index));
    return indices;
  }

  if (key === 'current') {
    const values = facilities
      .map((facility, index) => ({ index, value: facility.utilizationRate }))
      .filter((entry): entry is { index: number; value: number } =>
        typeof entry.value === 'number' && Number.isFinite(entry.value),
      );
    if (!values.length) return indices;
    const min = Math.min(...values.map((entry) => entry.value));
    values.filter((entry) => entry.value === min).forEach((entry) => indices.add(entry.index));
    return indices;
  }

  if (key === 'extended') {
    facilities.forEach((facility, index) => {
      if (facility.extendedCare === true) indices.add(index);
    });
    return indices;
  }

  return indices;
}

function buildBestMap(facilities: FacilityRow[]): Record<RowKey, Set<number>> {
  return {
    name: new Set(),
    type: new Set(),
    capacity: getBestValueIndices(facilities, 'capacity'),
    current: getBestValueIndices(facilities, 'current'),
    extended: getBestValueIndices(facilities, 'extended'),
    hours: new Set(),
    address: new Set(),
  };
}

function compareSkeleton(columnCount: number) {
  const rows = compareRows.length;
  const cols = Math.max(2, columnCount);
  return (
    <Card className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b border-border bg-surface-subtle px-3 py-3 text-sm font-medium text-text-muted">항목</th>
              {Array.from({ length: cols }, (_, col) => (
                <th key={`head-${col}`} className="min-w-52 border-b border-border bg-surface-subtle px-3 py-3 text-sm font-medium text-text-muted">
                  <div className="h-5 w-24 rounded bg-surface px-3 py-1" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={`s-${row}`}>
                <td className="border-b border-border px-3 py-3">
                  <div className="h-4 w-20 rounded bg-surface px-2 py-1" />
                </td>
                {Array.from({ length: cols }, (_, col) => (
                  <td key={`s-${row}-${col}`} className="border-b border-border px-3 py-3">
                    <div className="h-4 w-28 rounded bg-surface px-2 py-1" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function FacilityComparePage() {
  const searchParams = useSearchParams();
  const ids = parseIds(searchParams.get('ids'));

  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const fetchFacilities = async () => {
      if (ids.length < 2) {
        setFacilities([]);
        setErrorMessage(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const results = await Promise.allSettled(
          ids.map((facilityId) =>
            fetch(`/api/v1/facilities/${encodeURIComponent(facilityId)}`).then(async (res) => {
              if (!res.ok) {
                throw new Error(`조회 실패 (${facilityId})`);
              }

              const data = (await res.json()) as FacilityApiResponse;
              return normalizeFacility(data, facilityId);
            }),
          ),
        );

        if (canceled) return;

        const loaded = results
          .map((result, index) => (result.status === 'fulfilled' ? result.value : null))
          .filter((value): value is FacilityRow => value !== null);

        setFacilities(loaded);

        const failed = results.filter((result) => result.status === 'rejected').length;
        if (failed > 0) {
          setErrorMessage('일부 시설 정보를 불러오지 못했습니다.');
        }
        if (loaded.length === 0) {
          setErrorMessage('선택한 시설 정보를 불러오지 못했습니다.');
        }
      } catch {
        if (!canceled) {
          setErrorMessage('시설 정보 로딩에 실패했습니다.');
          setFacilities([]);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    fetchFacilities();

    return () => {
      canceled = true;
    };
  }, [ids.join(',')]);

  if (ids.length < 2) {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar title="시설 비교" showBack />
        <div className="px-4 py-6">
          <Card>
            <p className="text-sm font-semibold text-text-primary">비교할 시설을 2~3개 선택해 주세요</p>
          </Card>
        </div>
      </div>
    );
  }

  const bestMap = buildBestMap(facilities);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="시설 비교" showBack />

      <div className="px-4 py-4 space-y-3">
        {loading && compareSkeleton(ids.length)}

        {!loading && errorMessage && (
          <Card className="border-danger/40 bg-danger/5">
            <div className="mb-3 text-sm font-semibold text-danger">{errorMessage}</div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              다시 불러오기
            </Button>
          </Card>
        )}

        {!loading && facilities.length > 0 && (
          <Card className="pb-2 pt-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <Badge>선택 시설: {facilities.length}개</Badge>
              <span className="text-xs text-text-muted">최대 3개 비교</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full table-fixed border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-28 border-b border-border bg-surface px-3 py-3 text-xs font-medium uppercase tracking-wide text-text-muted">항목</th>
                    {facilities.map((facility) => (
                      <th
                        key={facility.id}
                        className="min-w-52 border-b border-border bg-surface px-3 py-3 text-xs font-medium uppercase tracking-wide text-text-muted"
                      >
                        <div className="flex flex-col gap-1">
                          <Badge variant="status">시설</Badge>
                          <p className="truncate text-sm font-semibold text-text-primary">{facility.label}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.key}>
                      <th className="sticky left-0 z-10 w-28 border-b border-border bg-surface px-3 py-3 text-xs font-semibold text-text-primary">{row.label}</th>
                      {facilities.map((facility, index) => {
                        const isBest = bestMap[row.key]?.has(index);
                        return (
                          <td
                            key={`${row.key}-${facility.id}`}
                            className={`border-b border-border px-3 py-3 ${
                              isBest
                                ? 'bg-emerald-500/10 text-emerald-700 font-semibold'
                                : 'text-text-primary'
                            }`}
                          >
                            <p className="break-words">{row.formatter(facility)}</p>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
