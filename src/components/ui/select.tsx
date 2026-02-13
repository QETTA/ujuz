'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: boolean;
  errorMessage?: string;
  hint?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, errorMessage, hint, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const errorId = error && errorMessage ? `${selectId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="group relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border bg-surface px-3 pr-9 text-sm text-text-primary',
              'transition-colors duration-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-danger ring-danger focus:border-danger focus:ring-danger' : 'border-border',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary transition-transform duration-200 group-focus-within:rotate-180"
            aria-hidden="true"
          />
        </div>
        {error && errorMessage && (
          <p id={errorId} className="text-xs text-danger" role="alert">
            {errorMessage}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-text-tertiary">{hint}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
