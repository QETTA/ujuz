'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const code = searchParams.get('code') ?? 'UNKNOWN';
  const message = searchParams.get('message') ?? '결제가 실패했습니다.';
  const retryHref = orderId && amount
    ? `/consult/payment?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}`
    : '/consult/payment';

  useEffect(() => {
    console.info('payment_confirm_fail', { reason: code, message, orderId: orderId ?? '' });
  }, [code, message, orderId]);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <TopBar showBack title="결제 실패" />
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-6">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-text-primary">결제 실패</h2>
          <p className="mt-2 text-text-secondary">{message}</p>
          <p className="mt-1 text-xs text-text-tertiary">오류 코드: {code}</p>
          <p className="mt-1 text-xs text-text-tertiary">문제가 반복되면 고객센터로 문의해 주세요.</p>
          <div className="mt-6 space-y-2">
            <Button variant="primary" className="w-full" onClick={() => router.push(retryHref)}>
              다시 시도
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => router.push('/')}>
              홈으로
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
