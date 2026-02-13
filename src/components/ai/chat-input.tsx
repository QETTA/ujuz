/**
 * Thin wrapper: delegates to the primary ChatInput in composites/.
 * Adds mobile-specific padding (pb-safe-bottom) for the AI page layout.
 */
'use client';

import { ChatInput as PrimaryChatInput } from '@/components/composites/ChatInput';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  onSend: (text: string) => void;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, suggestions = [], disabled, className }: ChatInputProps) {
  return (
    <PrimaryChatInput
      onSend={onSend}
      suggestions={suggestions}
      disabled={disabled}
      placeholder="질문을 입력하세요..."
      className={cn('safe-bottom', className)}
    />
  );
}
