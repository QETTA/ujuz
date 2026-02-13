'use client';

import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = '메시지를 입력하세요...',
  suggestions,
  className,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className={cn('border-t border-border bg-surface p-3', className)}>
      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div role="region" aria-label="추천 질문">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSend(suggestion)}
                disabled={disabled}
                aria-disabled={disabled ? 'true' : undefined}
                className={cn(
                  'shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-600 hover:bg-brand-50 hover:border-brand-300 focus:outline-2 focus:outline-offset-2 focus:outline-brand-500 active:scale-95 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                  disabled && 'opacity-50'
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-text-inverse transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="전송"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
