'use client';

import { useState } from 'react';
import { TopBar } from '@/components/nav/top-bar';
import { TabBar } from '@/components/nav/tab-bar';
import { ChatThread } from '@/components/ai/chat-thread';
import { ChatInput } from '@/components/ai/chat-input';
import { AIDisclaimer } from '@/components/ai/ai-disclaimer';
import { useChat } from '@/lib/client/hooks/useChat';
import type { BotMessage } from '@/lib/types';

const tabs = [
  { key: 'chat', label: 'AI 상담' },
  { key: 'score', label: '입학점수' },
];

/** Convert AI SDK UIMessage to BotMessage for legacy components */
function toBotMessages(messages: ReturnType<typeof useChat>['messages']): BotMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(''),
    created_at: new Date().toISOString(),
  }));
}

export default function AIPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const { messages: rawMessages, isLoading: loading, suggestions, send: sendMessage } = useChat();
  const messages = toBotMessages(rawMessages);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar title="AI 허브" />

      <div className="px-md pt-sm">
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'chat' ? (
        <>
          <ChatThread messages={messages} loading={loading} />
          <AIDisclaimer variant="banner" className="mx-md mb-1" />
          <ChatInput
            onSend={sendMessage}
            suggestions={suggestions}
            disabled={loading}
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-md text-center">
          <p className="text-lg font-semibold text-text-primary">입학점수 시뮬레이터</p>
          <p className="mt-1 text-sm text-text-secondary">
            시설을 선택하고 입소 확률을 확인하세요
          </p>
          <AIDisclaimer className="mt-4" />
        </div>
      )}
    </div>
  );
}
