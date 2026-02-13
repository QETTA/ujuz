import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';
import type { Grade } from '@/lib/types';

export type BadgeVariant = 'grade' | 'status' | 'count';

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
  const base = 'inline-flex items-center justify-center rounded-full text-xs font-medium whitespace-nowrap';

  if (variant === 'grade' && grade) {
    return (
      <span
        className={cn(base, 'px-2.5 py-0.5', gradeColors[grade], className)}
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
        className={cn(base, 'min-w-5 h-5 px-1.5 bg-danger text-text-inverse', className)}
        {...props}
      >
        {children}
      </span>
    );
  }

  // status variant (default)
  return (
    <span
      className={cn(base, 'px-2.5 py-0.5 bg-brand-100 text-brand-700', className)}
      {...props}
    >
      {children}
    </span>
  );
}
