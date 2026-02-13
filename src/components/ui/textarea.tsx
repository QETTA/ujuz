import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id ?? (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint && !error ? `${textareaId}-hint` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={errorId ?? hintId}
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'transition-colors duration-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed min-h-[220px]',
            error ? 'border-danger' : 'border-border',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-tertiary">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
