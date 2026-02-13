'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-sm',
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed = false, onPressedChange, size = 'md', className, children, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={pressed}
        data-state={pressed ? 'on' : 'off'}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          onPressedChange?.(!pressed);
        }}
        className={cn(
          'inline-flex items-center justify-center rounded-lg border font-medium transition-all duration-200 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'bg-transparent text-text-secondary border-border hover:bg-surface-inset data-[state=on]:bg-brand-500/10 data-[state=on]:text-brand-600 data-[state=on]:border-brand-500/30',
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Toggle.displayName = 'Toggle';
