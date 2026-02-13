import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card';

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded-md',
  circular: 'h-10 w-10 rounded-full',
  rectangular: 'h-24 w-full rounded-lg',
  card: 'h-40 w-full rounded-xl',
};

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

export function Skeleton({ variant = 'text', className, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="로딩 중"
      className={cn(
        'animate-pulse bg-surface-inset',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
