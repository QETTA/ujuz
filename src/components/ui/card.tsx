import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

export type CardVariant = 'default' | 'glass' | 'elevated';

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface-elevated border border-border shadow-sm',
  glass: 'glass border border-border-subtle',
  elevated: 'bg-surface-elevated shadow-md',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-4',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-2', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-text-primary', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm text-text-secondary', className)} {...props}>
      {children}
    </div>
  );
}
