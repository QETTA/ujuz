'use client';

import { useCallback } from 'react';
import { useChatStore } from '@/lib/store';

export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const conversationId = useChatStore((s) => s.conversationId);
  const loading = useChatStore((s) => s.loading);
  const suggestions = useChatStore((s) => s.suggestions);
  const error = useChatStore((s) => s.error);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clear = useChatStore((s) => s.clear);
  const loadConversation = useChatStore((s) => s.loadConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const conversations = useChatStore((s) => s.conversations);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const send = useCallback(
    (text: string, context?: Record<string, unknown>) => {
      return sendMessage(text, context);
    },
    [sendMessage],
  );

  return {
    messages,
    conversationId,
    conversations,
    loading,
    suggestions,
    error,
    send,
    clear,
    loadConversation,
    loadConversations,
    deleteConversation,
  };
}
