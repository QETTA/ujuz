'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-danger">오류가 발생했습니다</h1>
      <p className="mt-2 text-text-secondary">
        문제가 지속되면 새로고침 해 주세요.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-brand-600"
      >
        다시 시도
      </button>
    </main>
  );
}
