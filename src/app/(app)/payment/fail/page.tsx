'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code') ?? 'UNKNOWN';
  const message = searchParams.get('message') ?? '결제가 실패했습니다.';

  return (
    <div className="flex flex-col min-h-screen bg-surface-primary">
      <TopBar showBack title="결제 실패" />
      <div className="flex-1 flex items-center justify-center px-md">
        <Card className="w-full max-w-md text-center p-lg">
          <div className="text-4xl mb-md">❌</div>
          <h2 className="text-xl font-bold text-text-primary">결제 실패</h2>
          <p className="mt-sm text-text-secondary">{message}</p>
          <p className="mt-xs text-xs text-text-tertiary">오류 코드: {code}</p>
          <div className="mt-lg space-y-sm">
            <Button variant="primary" className="w-full" onClick={() => router.push('/pricing')}>
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
