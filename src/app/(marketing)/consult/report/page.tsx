'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type ReportStatus = 'WRITING' | 'READY' | 'DELIVERED';

interface ActionItem {
  title: string;
  detail: string;
}

interface ReportResponse {
  status: ReportStatus;
  report?: {
    summary: string;
    actions: ActionItem[];
  };
  pdf_url?: string;
}

const STATUS_COPY: Record<ReportStatus, { title: string; description: string }> = {
  WRITING: {
    title: '리포트를 작성하고 있어요',
    description: '전문가가 사전 설문과 예약 내용을 바탕으로 맞춤 전략을 정리 중입니다.',
  },
  READY: {
    title: '리포트가 준비되었어요',
    description: '요약 내용을 확인하고 PDF 원본을 다운로드할 수 있어요.',
  },
  DELIVERED: {
    title: '리포트 전달이 완료되었어요',
    description: '아래 요약과 다음 행동 체크리스트를 다시 확인해 보세요.',
  },
};

const FALLBACK_CHECKLIST: ActionItem[] = [
  {
    title: '희망 시설 우선순위 확정',
    detail: '가정 상황과 통학 동선을 고려해 상위 3개 시설을 최종 정리하세요.',
  },
  {
    title: '입소 증빙서류 점검',
    detail: '맞벌이, 다자녀 등 가점 항목에 필요한 서류를 미리 준비하세요.',
  },
  {
    title: 'TO 알림 설정',
    detail: '관심 시설의 여석 변동을 즉시 확인할 수 있도록 알림을 켜두세요.',
  },
];

type ReportAnalyticsEvent = 'report_view' | 'report_download' | 'report_cta_alert_setup';

function trackReportEvent(event: ReportAnalyticsEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('ujuz:analytics', {
    detail: {
      event,
      ...payload,
    },
  }));
}

function ConsultationReportPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? searchParams.get('order_id') ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError('주문 ID가 없어 리포트를 조회할 수 없어요.');
      return;
    }

    let aborted = false;

    setLoading(true);
    setError(null);

    fetch(`/api/v1/consultations/orders/${encodeURIComponent(orderId)}/report`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          const message = (body as { error?: { message?: string } } | null)?.error?.message;
          throw new Error(message ?? '리포트를 불러오지 못했어요.');
        }

        return body as ReportResponse;
      })
      .then((body) => {
        if (aborted) return;
        setReportData(body);
        trackReportEvent('report_view', { order_id: orderId, status: body.status });
      })
      .catch((fetchError: unknown) => {
        if (aborted) return;

        setReportData(null);
        setError(fetchError instanceof Error ? fetchError.message : '리포트를 불러오지 못했어요.');
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, [orderId]);

  const status = reportData?.status ?? 'WRITING';
  const statusCopy = STATUS_COPY[status];
  const canDownload = status === 'READY' && !!reportData?.pdf_url;
  const checklist = reportData?.report?.actions?.length ? reportData.report.actions : FALLBACK_CHECKLIST;

  const handleDownload = () => {
    if (!reportData?.pdf_url) return;

    trackReportEvent('report_download', {
      order_id: orderId,
      status,
    });

    window.open(reportData.pdf_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary">상담 리포트</h1>
      <p className="mt-2 text-sm text-text-secondary">
        주문 ID: <span className="font-mono">{orderId || '-'}</span>
      </p>

      {loading && (
        <Card className="mt-6 space-y-2">
          <p className="text-sm font-medium text-text-primary">리포트를 불러오는 중...</p>
          <p className="text-sm text-text-secondary">잠시만 기다려 주세요.</p>
        </Card>
      )}

      {!loading && error && (
        <Card className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-danger">리포트를 불러오지 못했어요.</p>
          <p className="text-sm text-text-secondary">{error}</p>
          <Button variant="secondary" className="w-full" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </Card>
      )}

      {!loading && !error && (
        <>
          <Card className="mt-6 space-y-3">
            <p className="text-xs font-semibold text-brand-600">상태: {status}</p>
            <h2 className="text-lg font-semibold text-text-primary">{statusCopy.title}</h2>
            <p className="text-sm text-text-secondary">{statusCopy.description}</p>

            {(status === 'READY' || status === 'DELIVERED') && (
              <>
                <div className="h-px bg-border" />
                <p className="text-sm font-medium text-text-primary">요약</p>
                <p className="text-sm text-text-secondary">
                  {reportData?.report?.summary ?? '요약이 준비되는 대로 표시됩니다.'}
                </p>
              </>
            )}

            {status === 'READY' && (
              <Button className="w-full" disabled={!canDownload} onClick={handleDownload}>
                PDF 다운로드
              </Button>
            )}
          </Card>

          <Card className="mt-4 space-y-3">
            <h3 className="text-base font-semibold text-text-primary">다음 행동 체크리스트</h3>
            <ul className="space-y-2">
              {checklist.map((item, index) => (
                <li key={`${item.title}-${index}`} className="rounded-lg border border-border bg-surface-elevated p-3">
                  <p className="text-sm font-medium text-text-primary">{item.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
                </li>
              ))}
            </ul>
          </Card>

          <div className="mt-4">
            <Link
              href="/alerts"
              onClick={() => trackReportEvent('report_cta_alert_setup', { order_id: orderId, status })}
            >
              <Button variant="secondary" className="w-full">TO 알림 구독 만들기</Button>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}


export default function ConsultationReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ConsultationReportPageContent />
    </Suspense>
  );
}
