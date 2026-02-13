'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { ChatBubble } from '@/components/composites/ChatBubble';
import { ChatInput } from '@/components/composites/ChatInput';
import { ConversationListItem } from '@/components/composites/ConversationListItem';
import { ChatError } from '@/components/ai/chat-error';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Spinner } from '@/components/primitives/Spinner';
import { useChat } from '@/lib/client/hooks/useChat';
import { Bars3Icon, ChatBubbleLeftEllipsisIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ChatPage() {
  const [showMobileList, setShowMobileList] = useState(false);

  const {
    messages,
    conversations,
    isLoading,
    error,
    suggestions,
    send,
    clear,
    loadConversation,
    loadConversations,
    deleteConversation,
    conversationId,
    getTextContent,
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

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) return;

    const text = getTextContent(lastUserMessage).trim();
    if (!text) return;

    send(text);
  };

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col lg:h-dvh">
      <PageHeader
        title="AI 상담"
        rightAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMobileList(true)}
              className="text-text-secondary hover:text-text-primary lg:hidden"
              aria-label="대화 목록"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            {conversationId && (
              <button
                type="button"
                onClick={clear}
                className="text-xs text-brand-600 hover:underline"
              >
                새 대화
              </button>
            )}
          </div>
        }
      />

      {/* Mobile conversation list overlay */}
      {showMobileList && (
        <div className="fixed inset-0 z-overlay lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileList(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface border-r border-border overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between p-3">
              <button
                type="button"
                onClick={() => {
                  clear();
                  setShowMobileList(false);
                }}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-text-inverse hover:bg-brand-600 transition-colors"
              >
                새 대화 시작
              </button>
              <button
                type="button"
                onClick={() => setShowMobileList(false)}
                className="ml-2 p-1.5 text-text-tertiary hover:text-text-primary"
                aria-label="닫기"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-0.5 px-2">
              {conversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === conversationId}
                  onSelect={() => {
                    loadConversation(conv.id);
                    setShowMobileList(false);
                  }}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))}
            </div>
          </aside>
        </div>
      )}

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
          {/* Messages — role="log" + aria-live for screen readers */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-busy={isLoading}
            aria-label="대화 메시지"
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 ? (
              <EmptyState
                icon={<ChatBubbleLeftEllipsisIcon className="h-8 w-8" />}
                title="무엇이 궁금하세요?"
                description="어린이집 입소에 관한 무엇이든 물어보세요. AI가 맞춤 답변을 드려요."
              />
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className="animate-message-enter"
                    style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                  >
                    <ChatBubble message={msg} />
                  </div>
                ))}
                {error && (
                  <ChatError
                    message={error}
                    onRetry={handleRetry}
                  />
                )}
                {isLoading && (
                  <div className="flex justify-start animate-message-enter">
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
