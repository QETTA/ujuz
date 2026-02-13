import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-8 md:py-16 text-center animate-in fade-in-0 duration-300 motion-reduce:animate-none',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-inset text-text-tertiary animate-bounce [animation-duration:2.2s] motion-reduce:animate-none">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-text-tertiary">{description}</p>
      )}
      {action && (
        <div className="mt-4 inline-flex transition-transform duration-150 hover:scale-105 motion-reduce:transform-none motion-reduce:hover:scale-100">
          {action}
        </div>
      )}
    </div>
  );
}
