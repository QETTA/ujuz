import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';
import type { Grade } from '@/lib/types';

export type BadgeVariant = 'grade' | 'status' | 'count' | 'notification';

const gradeColors: Record<Grade, string> = {
  A: 'bg-grade-a/15 text-grade-a',
  B: 'bg-grade-b/15 text-grade-b',
  C: 'bg-grade-c/15 text-grade-c',
  D: 'bg-grade-d/15 text-grade-d',
  E: 'bg-grade-e/15 text-grade-e',
  F: 'bg-grade-f/15 text-grade-f',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  grade?: Grade;
}

export function Badge({ variant = 'status', grade, className, children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-medium transition-all duration-200 ease-smooth motion-reduce:transition-none';
  const interactiveClasses =
    typeof props.onClick === 'function' ||
    props.role === 'button' ||
    props.role === 'link' ||
    props.tabIndex !== undefined
      ? 'cursor-pointer transform-gpu hover:scale-105 active:scale-100 motion-reduce:hover:scale-100'
      : '';

  if (variant === 'grade' && grade) {
    return (
      <span
        className={cn(base, interactiveClasses, 'px-2.5 py-0.5', gradeColors[grade], className)}
        aria-label={`등급 ${grade}`}
        {...props}
      >
        {children ?? grade}
      </span>
    );
  }

  if (variant === 'count') {
    return (
      <span
        className={cn(
          base,
          interactiveClasses,
          'h-5 min-w-5 bg-danger px-1.5 text-text-inverse',
          className,
        )}
        aria-live={props['aria-live'] ?? 'polite'}
        aria-atomic={props['aria-atomic'] ?? true}
        {...props}
      >
        {children}
      </span>
    );
  }

  if (variant === 'notification') {
    return (
      <span
        className={cn(
          base,
          interactiveClasses,
          'h-5 min-w-5 bg-danger px-1.5 text-text-inverse shadow-sm ring-1 ring-danger/35 motion-safe:animate-notification-pulse motion-reduce:animate-none',
          className,
        )}
        aria-live={props['aria-live'] ?? 'polite'}
        aria-atomic={props['aria-atomic'] ?? true}
        {...props}
      >
        {children}
      </span>
    );
  }

  // status variant (default)
  return (
    <span
      className={cn(
        base,
        interactiveClasses,
        'bg-brand-100 px-2.5 py-0.5 text-brand-700',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
