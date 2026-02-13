'use client';

import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { SuggestionChip } from './suggestion-chip';

export interface ChatInputProps {
  onSend: (text: string) => void;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, suggestions = [], disabled, className }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleSuggestion = (suggestion: string) => {
    if (disabled) return;
    onSend(suggestion);
  };

  return (
    <div className={cn('border-t border-border bg-surface px-md pb-safe-bottom pt-sm', className)}>
      {suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <SuggestionChip key={s} text={s} onClick={handleSuggestion} />
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="질문을 입력하세요..."
          disabled={disabled}
          className="flex-1 rounded-full border border-border bg-surface-inset px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          aria-label="메시지 입력"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-text-inverse transition-colors hover:bg-brand-600 disabled:opacity-50"
          aria-label="전송"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
