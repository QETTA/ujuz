'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type RecommendationSummary = {
  id: string;
  overall_grade: string;
  one_liner: string;
  routes_count: number;
  created_at: string;
};

type RecommendationHistoryResponse = {
  items: RecommendationSummary[];
  total: number;
  limit: number;
  offset: number;
};

function gradeChipClass(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'B':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'C':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'D':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'E':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-red-100 text-red-700 border-red-200';
  }
}

export default function RecommendationHistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<RecommendationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchHistory = async (offset: number, isLoadMore = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/recommendations/history?limit=${limit}&offset=${offset}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? '추천 기록을 불러오지 못했습니다');
      }

      const data = (await res.json()) as RecommendationHistoryResponse;
      if (!isLoadMore) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }

      setTotal(data.total);
      setNextOffset(offset + data.items.length);
      setLimit(data.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : '추천 기록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    if (loading) return;
    if (items.length >= total) return;
    fetchHistory(nextOffset, true);
  };

  const toKoreanDate = (value: string) => {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
      return '날짜 정보 없음';
    }

    return dt.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopBar title="추천 기록" showBack />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
        <p className="text-sm text-text-secondary">최근 분석 내역을 확인하고 과거 결과를 다시 볼 수 있습니다.</p>

        {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        {items.length === 0 && !loading && !error ? (
          <div className="rounded-lg border border-border-subtle bg-surface-elevated p-6 text-center text-text-secondary">
            아직 분석 기록이 없습니다
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer border-border hover:border-brand-200"
              onClick={() => router.push(`/recommendations/${item.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${gradeChipClass(item.overall_grade)}`}
                >
                  {item.overall_grade}
                </span>
                <p className="text-xs text-text-tertiary">{toKoreanDate(item.created_at)}</p>
              </div>

              <p className="mt-3 text-sm font-medium text-text-primary">{item.one_liner}</p>
              <p className="mt-2 text-xs text-text-secondary">추천 루트 {item.routes_count}개</p>
            </Card>
          ))}
        </div>

        {items.length < total ? (
          <div className="py-2">
            <Button
              onClick={handleLoadMore}
              variant="secondary"
              className="w-full"
              loading={loading}
            >
              더 보기
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
