'use client';

import { useState } from 'react';
import { TopBar } from '@/components/nav/top-bar';
import { TabBar } from '@/components/nav/tab-bar';
import { ChatThread } from '@/components/ai/chat-thread';
import { ChatInput } from '@/components/ai/chat-input';
import { AIDisclaimer } from '@/components/ai/ai-disclaimer';
import { useChatStore } from '@/lib/store';

const tabs = [
  { key: 'chat', label: 'AI 상담' },
  { key: 'score', label: '입학점수' },
];

export default function AIPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const { messages, loading, suggestions, sendMessage } = useChatStore();

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
