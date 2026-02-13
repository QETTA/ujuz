'use client';

import { cn } from '@/lib/utils';

export interface SuggestionChipProps {
  text: string;
  onClick: (text: string) => void;
  className?: string;
}

export function SuggestionChip({ text, onClick, className }: SuggestionChipProps) {
  return (
    <button
      onClick={() => onClick(text)}
      className={cn(
        'rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary',
        'transition-colors hover:border-brand-400 hover:text-brand-600',
        className,
      )}
      aria-label={`추천 질문: ${text}`}
    >
      {text}
    </button>
  );
}
