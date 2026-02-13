'use client';

import { ChatInput as PrimaryChatInput } from '@/components/composites/ChatInput';

export interface ChatInputProps {
  onSend: (text: string) => void;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, suggestions, disabled, className }: ChatInputProps) {
  return (
    <PrimaryChatInput
      onSend={onSend}
      suggestions={suggestions}
      disabled={disabled}
      className={className}
    />
  );
}
