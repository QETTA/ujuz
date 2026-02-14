'use client';

import { cn } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState, type ReactNode } from 'react';

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
  children: ReactNode;
  className?: string;
}

const REMOVE_ANIMATION_MS = 200;

export function Chip({ variant = 'default', removable, onRemove, children, className }: ChipProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemovable = Boolean(removable && onRemove);

  useEffect(() => {
    return () => {
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
      }
    };
  }, []);

  const handleRemove = () => {
    if (!onRemove || isRemoving) {
      return;
    }

    if (removeTimeoutRef.current) {
      clearTimeout(removeTimeoutRef.current);
    }

    setIsRemoving(true);
    removeTimeoutRef.current = setTimeout(() => {
      onRemove();
    }, REMOVE_ANIMATION_MS);
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 animate-in fade-in fade-in-0 hover:scale-105 hover:brightness-105 active:scale-95',
        isRemovable && isRemoving && 'pointer-events-none scale-95 opacity-0',
        variantStyles[variant],
        className,
      )}
    >
      {children}
      {isRemovable && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          className="ml-0.5 rounded-full p-0.5 transition-colors duration-200 hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed"
          aria-label="삭제"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
