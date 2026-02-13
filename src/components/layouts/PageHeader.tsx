'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  rightAction?: ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  rightAction,
  className,
  sticky = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'z-sticky border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-3',
        sticky && 'sticky top-0',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-inset transition-colors"
            aria-label="뒤로 가기"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-text-primary truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-text-tertiary truncate">{subtitle}</p>
          )}
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
}
