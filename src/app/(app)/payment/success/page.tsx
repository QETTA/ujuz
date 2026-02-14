'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface ConfirmResponse {
  status: string;
  receipt_url?: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const paymentKey = searchParams.get('paymentKey');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      console.info('payment_confirm_fail', { reason: 'missing_query' });
      return;
    }

    apiFetch<ConfirmResponse>('/api/v1/payments/confirm', {
      method: 'POST',
      json: {
        paymentKey,
        orderId,
        amount: Number(amount),
      },
    })
      .then((data) => {
        if (data.status !== 'PAID') {
          setStatus('error');
          setErrorMessage('결제 확인에 실패했습니다.');
          console.info('payment_confirm_fail', { reason: 'unexpected_status', orderId });
          return;
        }
        setReceiptUrl(data.receipt_url ?? null);
        setStatus('success');
        console.info('payment_confirm_success', { orderId });
      })
      .catch((error: unknown) => {
        setStatus('error');
        const message = error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.';
        setErrorMessage(message);
        console.info('payment_confirm_fail', { reason: message, orderId });
      });
  }, [amount, orderId, paymentKey]);

  const retryHref = orderId && amount
    ? `/consult/payment?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}`
    : '/consult/payment';
  const bookingHref = orderId
    ? `/consult/booking?orderId=${encodeURIComponent(orderId)}`
    : '/consult/booking';

  return (
    <div className="flex flex-col min-h-screen bg-surface-inset">
      <TopBar showBack title="결제 결과" />
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-6">
          {status === 'loading' && (
            <>
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-xl font-bold text-text-primary">결제 확인 중...</h2>
              <p className="mt-2 text-text-secondary">잠시만 기다려 주세요.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-text-primary">결제 완료!</h2>
              <p className="mt-2 text-text-secondary">
                상담 주문 결제가 완료되었습니다. 다음 단계에서 예약 가능한 시간을 선택해 주세요.
              </p>
              {receiptUrl ? (
                <Button
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => window.open(receiptUrl, '_blank', 'noopener,noreferrer')}
                >
                  영수증 보기
                </Button>
              ) : null}
              <Button
                variant="primary"
                className="mt-6 w-full"
                onClick={() => router.push(bookingHref)}
              >
                예약 진행하기
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-text-primary">결제 실패</h2>
              <p className="mt-2 text-text-secondary">{errorMessage}</p>
              <div className="mt-6 space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push(retryHref)}
                >
                  다시 시도
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/')}
                >
                  홈으로
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
