'use client';

import { useCallback, useMemo } from 'react';
import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { useChatStore } from '@/lib/store';
import { getDeviceId } from '@/lib/api';

/**
 * Extract plain text from a UIMessage's parts array.
 */
function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

// Shared transport instance (configured once)
const chatTransport = new DefaultChatTransport({
  api: '/api/bot/chat/stream',
  headers: () => ({ 'x-device-id': typeof window !== 'undefined' ? getDeviceId() : '' }),
});

export function useChat() {
  const aiChat = useAIChat({
    transport: chatTransport,
  });

  // Conversation CRUD from Zustand store
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const storeLoadConversation = useChatStore((s) => s.loadConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  // Load a past conversation: fetch from Zustand then inject into AI SDK
  const loadConversation = useCallback(
    async (id: string) => {
      await storeLoadConversation(id);
      const storeMessages = useChatStore.getState().messages;
      // Convert BotMessage[] → UIMessage[]
      const aiMessages: UIMessage[] = storeMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }));
      aiChat.setMessages(aiMessages);
    },
    [storeLoadConversation, aiChat],
  );

  const clear = useCallback(() => {
    aiChat.setMessages([]);
  }, [aiChat]);

  // Send a text message (compatible with ChatInput's onSend)
  const send = useCallback(
    (text: string) => {
      aiChat.sendMessage({ text });
    },
    [aiChat],
  );

  // Derive isLoading from AI SDK status
  const isLoading = aiChat.status === 'submitted' || aiChat.status === 'streaming';

  return useMemo(() => ({
    messages: aiChat.messages,
    isLoading,
    conversationId: useChatStore.getState().conversationId,
    suggestions: [] as string[],
    error: aiChat.error?.message ?? null,
    send,
    clear,
    loadConversation,
    loadConversations,
    conversations,
    deleteConversation,
    // Expose for components that need text content from UIMessage
    getTextContent,
  }), [
    aiChat.messages,
    isLoading,
    aiChat.error,
    send,
    clear,
    loadConversation,
    loadConversations,
    conversations,
    deleteConversation,
  ]);
}
