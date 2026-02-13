'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({ className, label = '뒤로 가기' }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-inset',
        className,
      )}
      aria-label={label}
    >
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );
}
