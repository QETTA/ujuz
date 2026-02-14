'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

const TOSS_SCRIPT_SRC = 'https://js.tosspayments.com/v1/payment';

interface InitiatePaymentResponse {
  pg_order_id: string;
  amount_krw: number;
  success_url: string;
  fail_url: string;
}

interface TossPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

interface TossPaymentsInstance {
  requestPayment(method: string, paymentInfo: TossPaymentRequest): Promise<void>;
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

function toAmountInputValue(raw: string | null): string {
  if (!raw) return '';
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '';
}

function parseAmount(raw: string): number | null {
  const amount = Number(raw.replaceAll(',', '').trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

async function ensureTossLoaded() {
  if (window.TossPayments) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TOSS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('결제 SDK 로드 실패')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TOSS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('결제 SDK 로드 실패'));
    document.head.appendChild(script);
  });

  if (!window.TossPayments) {
    throw new Error('결제 SDK가 초기화되지 않았습니다.');
  }
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export default function ConsultPaymentPage() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(() => searchParams.get('orderId') ?? searchParams.get('order_id') ?? '');
  const [amountInput, setAmountInput] = useState(() =>
    toAmountInputValue(searchParams.get('amount') ?? searchParams.get('amount_krw')),
  );
  const [orderName, setOrderName] = useState(
    () => searchParams.get('orderName') ?? searchParams.get('order_name') ?? 'UjuZ 상담 결제',
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const amountKrw = useMemo(() => parseAmount(amountInput), [amountInput]);
  const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';

  const handlePayment = async () => {
    if (loading) return;
    setErrorMessage(null);

    const normalizedOrderId = orderId.trim();
    const normalizedOrderName = orderName.trim();
    if (!normalizedOrderId || !normalizedOrderName || !amountKrw) {
      setErrorMessage('주문 ID, 금액, 주문명을 모두 입력해 주세요.');
      return;
    }
    if (!tossClientKey) {
      setErrorMessage('NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.');
      return;
    }

    setLoading(true);
    try {
      const initiated = await apiFetch<InitiatePaymentResponse>('/api/v1/payments/initiate', {
        method: 'POST',
        json: {
          order_id: normalizedOrderId,
          amount_krw: amountKrw,
          order_name: normalizedOrderName,
        },
      });

      console.info('payment_initiate', {
        order_id: initiated.pg_order_id,
        amount_krw: initiated.amount_krw,
      });

      await ensureTossLoaded();
      const tossPayments = window.TossPayments?.(tossClientKey);
      if (!tossPayments) {
        throw new Error('결제 SDK를 사용할 수 없습니다.');
      }

      await tossPayments.requestPayment('카드', {
        amount: initiated.amount_krw,
        orderId: initiated.pg_order_id,
        orderName: normalizedOrderName,
        successUrl: initiated.success_url,
        failUrl: initiated.fail_url,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopBar showBack title="상담 결제" />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
        <Card className="space-y-4 p-5">
          <h1 className="text-lg font-semibold text-text-primary">Toss 결제</h1>
          <p className="text-sm text-text-secondary">
            결제 완료 후 자동으로 결제 확인을 진행하고 예약 단계로 이동할 수 있습니다.
          </p>

          <Input
            label="주문 ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="ord_001"
            autoComplete="off"
          />
          <Input
            label="결제 금액 (KRW)"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="99000"
            inputMode="numeric"
            autoComplete="off"
          />
          <Input
            label="주문명"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            placeholder="UjuZ 상담 Standard"
            autoComplete="off"
          />

          {errorMessage ? (
            <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <Button type="button" className="w-full" onClick={handlePayment} disabled={loading}>
            {loading ? '결제창 준비 중...' : '결제하기'}
          </Button>
        </Card>
      </main>
    </div>
  );
}
