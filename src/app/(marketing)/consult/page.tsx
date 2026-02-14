'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tier = 'basic' | 'standard' | 'premium';

interface ConsultationPackage {
  id: string;
  tier: Tier;
  title: string;
  subtitle: string;
  price_krw: number;
  duration_min: number;
  includes: string[];
  sample_pdf_url: string;
}

interface PackagesResponse {
  packages?: ConsultationPackage[];
}

type AnalyticsParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (command: 'event', eventName: string, params?: AnalyticsParams) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const TIER_ORDER: Tier[] = ['basic', 'standard', 'premium'];

const TIER_LABELS: Record<Tier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

const COMPARISON_ROWS: Array<{ label: string; values: Record<Tier, string> }> = [
  {
    label: '상담 시간',
    values: {
      basic: '20분',
      standard: '40분',
      premium: '60분',
    },
  },
  {
    label: '리포트',
    values: {
      basic: '핵심 요약',
      standard: '우선순위 액션',
      premium: '실행 로드맵',
    },
  },
  {
    label: '사후 Q&A',
    values: {
      basic: '-',
      standard: '1회',
      premium: '2회',
    },
  },
  {
    label: '추천 대상',
    values: {
      basic: '빠른 진단',
      standard: '맞춤 전략',
      premium: '심화 코칭',
    },
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(price);
}

function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...params });
  }
}

function sortPackages(packages: ConsultationPackage[]) {
  return [...packages].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );
}

export default function ConsultLandingPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<ConsultationPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('consult_landing_view');
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetch('/api/v1/consultations/packages', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('failed_to_fetch_packages');
        }

        const payload = (await response.json()) as PackagesResponse;
        const list = Array.isArray(payload.packages) ? payload.packages : [];

        if (!mounted) return;

        setPackages(sortPackages(list));
        setError(list.length === 0 ? '현재 상담 상품을 준비 중입니다.' : null);
      } catch {
        if (!mounted) return;
        setError('상담 상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const samplePackage = useMemo(
    () => packages.find((item) => item.tier === 'standard') ?? packages[0],
    [packages],
  );

  const handleSelectTier = (tier: Tier, destination: '/consult/intake' | '/consult/booking') => {
    trackEvent('consult_tier_select', { tier });
    router.push(`${destination}?tier=${encodeURIComponent(tier)}`);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
      <section className="space-y-3">
        <Badge className="bg-brand-100 text-brand-700">전문가 1:1 상담</Badge>
        <h1 className="text-3xl font-bold text-text-primary">상담 상품 선택</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          우리 아이 상황과 입소 목표에 맞춰 상담 티어를 선택하세요. 설문을 먼저 작성하면 더 정확한
          상담과 리포트를 받을 수 있어요.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={`pkg-skeleton-${index}`} className="space-y-3 p-5">
              <div className="h-5 w-20 animate-pulse rounded bg-surface-inset" />
              <div className="h-4 w-48 animate-pulse rounded bg-surface-inset" />
              <div className="h-8 w-32 animate-pulse rounded bg-surface-inset" />
              <div className="h-28 animate-pulse rounded bg-surface-inset" />
            </Card>
          ))}

        {!loading &&
          packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`flex h-full flex-col justify-between gap-5 p-5 ${
                pkg.tier === 'standard' ? 'border-brand-400 shadow-md' : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-text-primary">{pkg.title}</h2>
                  {pkg.tier === 'standard' ? <Badge>추천</Badge> : null}
                </div>
                <p className="text-sm text-text-secondary">{pkg.subtitle}</p>
                <p className="text-3xl font-bold text-text-primary">{formatPrice(pkg.price_krw)}</p>
                <p className="text-xs text-text-tertiary">상담 시간 {pkg.duration_min}분</p>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-brand-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => handleSelectTier(pkg.tier, '/consult/intake')}
                >
                  설문 시작
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => handleSelectTier(pkg.tier, '/consult/booking')}
                >
                  상담 예약
                </Button>
              </div>
            </Card>
          ))}
      </section>

      {error ? (
        <Card className="border-danger/40 bg-danger/5 p-4 text-sm text-danger">{error}</Card>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-inset">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-text-primary">비교 항목</th>
                {TIER_ORDER.map((tier) => (
                  <th key={tier} className="px-4 py-3 text-left font-semibold text-text-primary">
                    {TIER_LABELS[tier]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-4 py-3 text-text-primary">{row.label}</td>
                  {TIER_ORDER.map((tier) => (
                    <td key={`${row.label}-${tier}`} className="px-4 py-3 text-text-secondary">
                      {row.values[tier]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-elevated p-5">
        <h3 className="text-lg font-semibold text-text-primary">샘플 리포트 미리보기</h3>
        <p className="mt-2 text-sm text-text-secondary">
          실제 리포트는 현재 상황, 희망 시기, 지역 기준을 반영해 우선순위 액션으로 제공됩니다.
        </p>

        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-text-tertiary">
            {samplePackage ? `${samplePackage.title} 샘플` : 'Standard 샘플'}
          </p>
          <h4 className="mt-1 text-base font-semibold text-text-primary">이번 달 실행 체크리스트</h4>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>1. 우선순위 높은 시설 5곳 TO 모니터링 설정</li>
            <li>2. 가점 항목 증빙 서류 준비 및 검토</li>
            <li>3. 입소 신청 시나리오 A/B 일정표 작성</li>
          </ul>
          <a
            href={samplePackage?.sample_pdf_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm font-medium text-brand-600 underline"
          >
            샘플 PDF 보기
          </a>
        </div>
      </section>
    </main>
  );
}
