'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export interface TopBarProps {
  title?: string;
  showBack?: boolean;
  /** Custom back handler. Falls back to router.back() on web. */
  onBack?: () => void;
  action?: ReactNode;
  transparent?: boolean;
}

export function TopBar({ title, showBack = false, onBack, action, transparent = false }: TopBarProps) {
  const router = useRouter();

  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-sticky flex h-14 items-center gap-3 px-md',
        transparent
          ? 'bg-transparent'
          : 'glass glass-text border-b border-border-subtle',
      )}
    >
      {showBack && (
        <button
          onClick={onBack ?? (() => router.back())}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-inset"
          aria-label="뒤로 가기"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
      )}
      {title && (
        <h1 className="flex-1 truncate text-lg font-semibold text-text-primary">
          {title}
        </h1>
      )}
      {!title && <div className="flex-1" />}
      {action && <div className="flex items-center">{action}</div>}
    </header>
  );
}
