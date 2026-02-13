'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMessage('결제 정보가 올바르지 않습니다.');
      return;
    }

    // Confirm payment with our backend
    fetch('/api/v1/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setErrorMessage(data.error ?? '결제 확인에 실패했습니다.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('네트워크 오류가 발생했습니다.');
      });
  }, [searchParams]);

  return (
    <div className="flex flex-col min-h-screen bg-surface-primary">
      <TopBar showBack title="결제 결과" />
      <div className="flex-1 flex items-center justify-center px-md">
        <Card className="w-full max-w-md text-center p-lg">
          {status === 'loading' && (
            <>
              <div className="text-4xl mb-md">⏳</div>
              <h2 className="text-xl font-bold text-text-primary">결제 확인 중...</h2>
              <p className="mt-sm text-text-secondary">잠시만 기다려 주세요.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-4xl mb-md">✅</div>
              <h2 className="text-xl font-bold text-text-primary">결제 완료!</h2>
              <p className="mt-sm text-text-secondary">
                구독이 활성화되었습니다. 이제 모든 기능을 이용하실 수 있습니다.
              </p>
              <Button
                variant="primary"
                className="mt-lg w-full"
                onClick={() => router.push('/')}
              >
                홈으로 돌아가기
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-4xl mb-md">❌</div>
              <h2 className="text-xl font-bold text-text-primary">결제 실패</h2>
              <p className="mt-sm text-text-secondary">{errorMessage}</p>
              <div className="mt-lg space-y-sm">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/pricing')}
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
