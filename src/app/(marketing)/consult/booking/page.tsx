'use client';

export const dynamic = 'force-dynamic';

import { Suspense, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface BookingResult {
  appointmentId: string;
  status: string;
}

type AnalyticsParams = Record<string, string | number | boolean>;

interface AnalyticsWindow extends Window {
  gtag?: (command: 'event', eventName: string, params?: AnalyticsParams) => void;
  dataLayer?: Array<Record<string, unknown>>;
}

function trackEvent(event: string, payload: AnalyticsParams = {}) {
  if (typeof window === 'undefined') return;
  const analyticsWindow = window as AnalyticsWindow;

  if (typeof analyticsWindow.gtag === 'function') {
    analyticsWindow.gtag('event', event, payload);
  }

  if (Array.isArray(analyticsWindow.dataLayer)) {
    analyticsWindow.dataLayer.push({ event, ...payload });
  }
}

function ConsultBookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialOrderId = useMemo(
    () => searchParams.get('orderId') ?? searchParams.get('order_id') ?? '',
    [searchParams],
  );

  const [orderId, setOrderId] = useState(initialOrderId);
  const [slots, setSlots] = useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    setOrderId(initialOrderId);
  }, [initialOrderId]);

  useEffect(() => {
    trackEvent('consult_booking_view', {
      ...(initialOrderId ? { order_id: initialOrderId } : {}),
    });
  }, [initialOrderId]);

  const handleSlotChange = (index: number, value: string) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? value : slot)));
  };

  const validate = (): string | null => {
    const trimmedOrderId = orderId.trim();
    if (!trimmedOrderId) {
      return '주문 ID를 입력해 주세요.';
    }

    if (slots.some((slot) => slot.trim().length === 0)) {
      return '희망 시간을 3개 모두 입력해 주세요.';
    }

    const timestamps = slots.map((slot) => new Date(slot).getTime());
    if (timestamps.some((time) => Number.isNaN(time))) {
      return '유효한 날짜/시간 형식으로 입력해 주세요.';
    }

    if (timestamps.some((time) => time <= Date.now())) {
      return '희망 시간은 현재 시각 이후로 선택해 주세요.';
    }

    if (new Set(timestamps).size !== timestamps.length) {
      return '희망 시간 3개는 서로 다르게 입력해 주세요.';
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);
    setError('');

    const trimmedOrderId = orderId.trim();
    const preferredTimes = slots.map((slot) => new Date(slot).toISOString());

    trackEvent('consult_booking_submit', {
      order_id: trimmedOrderId,
      slot_count: preferredTimes.length,
    });

    try {
      const response = await fetch(`/api/v1/consultations/orders/${encodeURIComponent(trimmedOrderId)}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferred_times: preferredTimes }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body?.error?.message || '예약 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setError(message);
        toast(message, 'error');
        return;
      }

      const appointmentId = typeof body?.appointment_id === 'string' ? body.appointment_id : '';
      const status = typeof body?.status === 'string' ? body.status : 'REQUESTED';
      setResult({ appointmentId, status });
      toast('예약 요청이 접수되었습니다.', 'success');
    } catch {
      const message = '네트워크 오류가 발생했습니다. 연결을 확인해 주세요.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopBar showBack title="상담 예약" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">희망 시간 3개를 선택해 주세요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>입력해 주신 시간 중 가능한 시간으로 상담 일정을 확정해 안내드려요.</p>
            <p className="text-xs text-text-tertiary">시간은 한국 시간 기준으로 입력해 주세요.</p>
          </CardContent>
        </Card>

        {result ? (
          <Card className="border-success/30 bg-success/5">
            <CardHeader>
              <CardTitle className="text-success">예약 요청이 완료되었습니다</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-text-primary">
              <p>예약 확인 후 문자 또는 앱 알림으로 확정 시간을 안내드릴게요.</p>
              {result.appointmentId && <p>예약 ID: {result.appointmentId}</p>}
              <p>상태: {result.status}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="sm:flex-1"
                  onClick={() => router.push(`/consult/report${orderId ? `?orderId=${encodeURIComponent(orderId)}` : ''}`)}
                >
                  리포트 상태 보기
                </Button>
                <Button type="button" variant="secondary" className="sm:flex-1" onClick={() => router.push('/')}>
                  홈으로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-2">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="주문 ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="예: ord_001"
                  required
                />

                <Input
                  label="희망 시간 1"
                  type="datetime-local"
                  value={slots[0]}
                  onChange={(e) => handleSlotChange(0, e.target.value)}
                  required
                />
                <Input
                  label="희망 시간 2"
                  type="datetime-local"
                  value={slots[1]}
                  onChange={(e) => handleSlotChange(1, e.target.value)}
                  required
                />
                <Input
                  label="희망 시간 3"
                  type="datetime-local"
                  value={slots[2]}
                  onChange={(e) => handleSlotChange(2, e.target.value)}
                  required
                />

                {error && (
                  <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" loading={submitting}>
                  예약 요청 제출
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


export default function ConsultBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <ConsultBookingPageContent />
    </Suspense>
  );
}
