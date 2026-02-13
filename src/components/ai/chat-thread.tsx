'use client';

import { useEffect, useRef } from 'react';
import type { BotMessage } from '@/lib/types';
import { ChatBubble } from './chat-bubble';
import { TypingIndicator } from './typing-indicator';

export interface ChatThreadProps {
  messages: BotMessage[];
  loading?: boolean;
}

export function ChatThread({ messages, loading }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-md text-center">
        <p className="text-lg font-semibold text-text-primary">AI 상담</p>
        <p className="mt-1 text-sm text-text-secondary">
          입소 전략, 시설 정보, 대기 현황 등을 질문해 보세요
        </p>
      </div>
    );
  }

  return (
    <div
      role="log"
      aria-live="polite"
      aria-busy={loading}
      aria-label="대화 메시지"
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-md py-sm"
    >
      {messages.map((msg) => (
        <div key={msg.id} className="animate-message-enter">
          <ChatBubble message={msg} />
        </div>
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
