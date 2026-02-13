"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { TopBar } from "@/components/nav/top-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExtendedCareFilter = "any" | "yes" | "no";

type FacilityType = "국공립" | "민간" | "가정" | "직장" | "협동";

interface FacilityItem {
  id?: string;
  facility_id?: string;
  _id?: string;
  name?: string;
  facility_name?: string;
  type?: FacilityType | string;
  address?: string;
  capacity?: number;
  capacity_min?: number;
  capacity_max?: number;
  min_capacity?: number;
  max_capacity?: number;
}

interface FacilitiesResponse {
  items: FacilityItem[];
  total?: number;
}

const FACILITY_TYPES: FacilityType[] = ["국공립", "민간", "가정", "직장", "협동"];
const PAGE_SIZE = 20;

const clampCapacity = (value: number) => Math.min(200, Math.max(0, value));

function normalizeNumber(value: string | null, fallback: number): number {
  if (value === null) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampCapacity(Math.trunc(parsed)) : fallback;
}

function getFacilityId(facility: FacilityItem): string {
  return facility.id ?? facility.facility_id ?? facility._id ?? "";
}

function getFacilityName(facility: FacilityItem): string {
  return facility.name || facility.facility_name || "시설명 없음";
}

function getCapacityText(facility: FacilityItem): string {
  if (typeof facility.capacity === "number") {
    return `${facility.capacity}명`;
  }

  const min = facility.capacity_min ?? facility.min_capacity;
  const max = facility.capacity_max ?? facility.max_capacity;

  if (typeof min === "number" && typeof max === "number") {
    return `${min}명 ~ ${max}명`;
  }

  if (typeof min === "number") {
    return `${min}명 이상`;
  }

  if (typeof max === "number") {
    return `${max}명 이하`;
  }

  return "정원 정보 없음";
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");

  const [selectedTypes, setSelectedTypes] = useState<FacilityType[]>(() => {
    const raw = searchParams.get("type") ?? "";
    if (!raw) {
      return [];
    }

    return raw
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is FacilityType =>
        FACILITY_TYPES.includes(item as FacilityType),
      );
  });

  const [regionInput, setRegionInput] = useState(() => searchParams.get("region") ?? "");
  const [extendedCare, setExtendedCare] = useState<ExtendedCareFilter>(() => {
    const raw = searchParams.get("extended_care");
    if (raw === "true" || raw === "1") return "yes";
    if (raw === "false" || raw === "0") return "no";
    return "any";
  });

  const [capacityMin, setCapacityMin] = useState<number>(() =>
    normalizeNumber(searchParams.get("capacity_min"), 0),
  );
  const [capacityMax, setCapacityMax] = useState<number>(() =>
    normalizeNumber(searchParams.get("capacity_max"), 200),
  );

  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const buildQueryString = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();

      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }

      if (selectedTypes.length > 0) {
        params.set("type", selectedTypes.join(","));
      }

      if (regionInput.trim()) {
        params.set("region", regionInput.trim());
      }

      if (extendedCare !== "any") {
        params.set("extended_care", extendedCare === "yes" ? "true" : "false");
      }

      params.set("capacity_min", String(capacityMin));
      params.set("capacity_max", String(capacityMax));
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      return params.toString();
    },
    [searchQuery, selectedTypes, regionInput, extendedCare, capacityMin, capacityMax],
  );

  const loadFacilities = useCallback(
    async (offset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        const query = buildQueryString(offset);
        const response = await fetch(`/api/v1/facilities?${query}`);

        if (!response.ok) {
          throw new Error("failed_fetch");
        }

        const data = (await response.json()) as FacilitiesResponse;
        const items = Array.isArray(data.items) ? data.items : [];

        setFacilities((prev) => (append ? [...prev, ...items] : items));
        setTotalCount(typeof data.total === "number" ? data.total : null);
        setHasMore(
          typeof data.total === "number"
            ? offset + items.length < data.total
            : items.length === PAGE_SIZE,
        );
        setNextOffset(offset + items.length);
      } catch {
        setErrorMessage("시설을 불러오지 못했습니다.");
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [buildQueryString],
  );

  useEffect(() => {
    setSelectedForCompare([]);
    setFacilities([]);
    setNextOffset(0);
    setHasMore(false);
    setTotalCount(null);
    void loadFacilities(0, false);
  }, [searchQuery, selectedTypes, regionInput, extendedCare, capacityMin, capacityMax, loadFacilities]);

  useEffect(() => {
    if (capacityMin > capacityMax) {
      setCapacityMax(capacityMin);
    }
  }, [capacityMin, capacityMax]);

  const handleTypeChange = (type: FacilityType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  };

  const handleCompareToggle = (facilityId: string, checked: boolean) => {
    setSelectedForCompare((prev) => {
      if (!facilityId) {
        return prev;
      }

      if (checked) {
        if (prev.includes(facilityId) || prev.length >= 3) {
          return prev;
        }
        return [...prev, facilityId];
      }

      return prev.filter((id) => id !== facilityId);
    });
  };

  const handleMoreClick = async () => {
    if (!hasMore || loadingMore) {
      return;
    }

    await loadFacilities(nextOffset, true);
  };

  const handleCompareClick = () => {
    if (selectedForCompare.length >= 2 && selectedForCompare.length <= 3) {
      const ids = selectedForCompare.join(",");
      router.push(`/facilities/compare?ids=${ids}`);
    }
  };

  const renderResultsCount = totalCount ?? facilities.length;

  return (
    <div className="min-h-screen bg-surface">
      <TopBar title="시설 검색" />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <section className="space-y-4">
          <div>
            <label htmlFor="facility-search" className="mb-2 block text-sm font-medium text-text-primary">
              시설 검색
            </label>
            <input
              id="facility-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm outline-none ring-offset-2 transition focus:ring-2 focus:ring-brand-500"
              placeholder="시설명, 지역, 키워드 검색"
            />
          </div>

          <details className="rounded-xl border border-border bg-surface-elevated p-4">
            <summary className="cursor-pointer text-sm font-semibold text-text-primary">
              필터 열기
            </summary>

            <div className="mt-4 grid gap-5">
              <fieldset>
                <legend className="mb-2 text-sm font-medium">시설유형</legend>
                <div className="flex flex-wrap gap-3">
                  {FACILITY_TYPES.map((type) => (
                    <label key={type} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => handleTypeChange(type)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="space-y-2">
                <span className="text-sm font-medium">지역 (시/구/동)</span>
                <input
                  value={regionInput}
                  onChange={(event) => setRegionInput(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none ring-2 ring-offset-2 transition focus:ring-brand-500"
                  placeholder="예: 강남구"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium">연장보육</p>
                <div className="inline-flex items-center rounded-lg border border-border bg-surface p-1">
                  {[
                    { value: "any", label: "전체" },
                    { value: "yes", label: "예" },
                    { value: "no", label: "아니오" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setExtendedCare(item.value as ExtendedCareFilter)}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        extendedCare === item.value
                          ? "bg-brand-500 text-white"
                          : "text-text-secondary"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">정원 (0~200)</p>
                <div className="grid gap-2">
                  <label className="text-xs text-text-secondary">
                    최소: {capacityMin}
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={capacityMin}
                      onChange={(event) => setCapacityMin(clampCapacity(Number(event.target.value)))}
                      className="mt-1 w-full"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    최대: {capacityMax}
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={capacityMax}
                      onChange={(event) => setCapacityMax(clampCapacity(Number(event.target.value)))}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
              </div>
            </div>
          </details>

          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              검색 결과: {renderResultsCount.toLocaleString()}건
            </p>

            {selectedForCompare.length >= 2 && selectedForCompare.length <= 3 && (
              <Button type="button" variant="secondary" onClick={handleCompareClick}>
                비교하기 ({selectedForCompare.length})
              </Button>
            )}
          </div>

          {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}

          {loading && facilities.length === 0 ? (
            <p className="text-sm text-text-secondary">로딩 중...</p>
          ) : (
            <>
              {facilities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-surface-elevated py-10 text-center text-sm text-text-secondary">
                  검색 결과가 없습니다
                </p>
              ) : (
                <div className="grid gap-3">
                  {facilities.map((facility) => {
                    const facilityId = getFacilityId(facility);
                    const facilityName = getFacilityName(facility);
                    const facilityType = facility.type ?? "미분류";
                    const isChecked = selectedForCompare.includes(facilityId);

                    return (
                      <Card
                        key={facilityId}
                        className="cursor-pointer transition hover:border-brand-400"
                        onClick={() => {
                          if (facilityId) {
                            router.push(`/facilities/${facilityId}`);
                          }
                        }}
                      >
                        <CardHeader className="flex-row items-center justify-between gap-3">
                          <div className="min-w-0">
                            <CardTitle className="truncate">{facilityName}</CardTitle>
                          </div>

                          <label
                            className="inline-flex shrink-0 items-center gap-2"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => {
                                handleCompareToggle(facilityId, event.target.checked);
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                              disabled={!facilityId || (selectedForCompare.length >= 3 && !isChecked)}
                            />
                            <span className="text-xs text-text-secondary">비교하기</span>
                          </label>
                        </CardHeader>

                        <CardContent>
                          <div className="mb-2">
                            <Badge>{facilityType}</Badge>
                          </div>
                          <p className="text-sm text-text-secondary">주소: {facility.address || "주소 정보 없음"}</p>
                          <p className="mt-1 text-sm text-text-secondary">정원: {getCapacityText(facility)}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {hasMore ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleMoreClick}
                  disabled={loadingMore}
                >
                  {loadingMore ? "불러오는 중..." : "더 보기"}
                </Button>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
