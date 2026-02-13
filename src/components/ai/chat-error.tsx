'use client';

import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface ChatErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ChatError({ message, onRetry, className }: ChatErrorProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3',
        className,
      )}
      role="alert"
    >
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-danger" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
