'use client';

import { cn } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';

export type ChipVariant = 'default' | 'brand' | 'success' | 'warning' | 'danger';

const variantStyles: Record<ChipVariant, string> = {
  default: 'bg-surface-inset text-text-secondary border-border-subtle',
  brand: 'bg-brand-100 text-brand-700 border-brand-200',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
};

export interface ChipProps {
  variant?: ChipVariant;
  removable?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ variant = 'default', removable, onRemove, children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label="삭제"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
