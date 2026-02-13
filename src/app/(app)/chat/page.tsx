'use client';

import { useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { ChatBubble } from '@/components/composites/ChatBubble';
import { ChatInput } from '@/components/composites/ChatInput';
import { ConversationListItem } from '@/components/composites/ConversationListItem';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Spinner } from '@/components/primitives/Spinner';
import { useChat } from '@/lib/client/hooks/useChat';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

export default function ChatPage() {
  const {
    messages,
    conversations,
    isLoading,
    suggestions,
    send,
    clear,
    loadConversation,
    loadConversations,
    deleteConversation,
    conversationId,
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col lg:h-dvh">
      <PageHeader
        title="AI 상담"
        rightAction={
          conversationId ? (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-brand-600 hover:underline"
            >
              새 대화
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: conversation list (desktop only) */}
        <aside className="hidden w-72 border-r border-border overflow-y-auto lg:block">
          <div className="p-3">
            <button
              type="button"
              onClick={clear}
              className="w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-text-inverse hover:bg-brand-600 transition-colors"
            >
              새 대화 시작
            </button>
          </div>
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === conversationId}
                onSelect={() => loadConversation(conv.id)}
                onDelete={() => deleteConversation(conv.id)}
              />
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <EmptyState
                icon={<ChatBubbleLeftEllipsisIcon className="h-8 w-8" />}
                title="무엇이 궁금하세요?"
                description="어린이집 입소에 관한 무엇이든 물어보세요. AI가 맞춤 답변을 드려요."
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-surface-elevated px-4 py-3">
                      <Spinner size="sm" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <ChatInput
            onSend={send}
            disabled={isLoading}
            suggestions={suggestions}
          />
        </div>
      </div>
    </div>
  );
}
