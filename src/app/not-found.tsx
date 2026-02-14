import Link from 'next/link';
import { ROUTES } from '@/lib/platform/navigation';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-brand-500">404</h1>
      <p className="mt-2 text-lg text-text-secondary">
        페이지를 찾을 수 없습니다
      </p>
      <Link
        href={ROUTES.HOME}
        className="mt-6 rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-brand-600"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
