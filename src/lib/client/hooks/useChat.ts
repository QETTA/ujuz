'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { z } from 'zod';
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

// Schema for message-metadata sent by the server
const chatMetadataSchema = z.object({
  conversation_id: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

type ChatMetadata = z.infer<typeof chatMetadataSchema>;
type ChatUIMessage = UIMessage<ChatMetadata>;

export function useChat() {
  // Track current conversationId for dynamic body
  const currentConvIdRef = useRef<string | null>(null);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/bot/chat/stream',
        headers: () => ({ 'x-device-id': typeof window !== 'undefined' ? getDeviceId() : '' }),
        body: () => {
          const convId = currentConvIdRef.current;
          return convId ? { conversation_id: convId } : {};
        },
      }),
    [],
  );

  const aiChat = useAIChat<ChatUIMessage>({
    transport: chatTransport,
    messageMetadataSchema: chatMetadataSchema,
  });

  // Conversation CRUD from Zustand store
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const storeLoadConversation = useChatStore((s) => s.loadConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  // Extract conversation_id and suggestions from the last assistant message metadata
  const lastAssistant = [...aiChat.messages].reverse().find((m) => m.role === 'assistant');
  const metaConversationId = (lastAssistant?.metadata as ChatMetadata | undefined)?.conversation_id ?? null;
  const suggestions = (lastAssistant?.metadata as ChatMetadata | undefined)?.suggestions ?? [];

  // Derive effective conversationId: metadata from stream takes priority
  const storeConversationId = useChatStore.getState().conversationId;
  const conversationId = metaConversationId ?? storeConversationId;

  // Keep ref in sync for dynamic body
  currentConvIdRef.current = conversationId;

  // Sync conversation_id to Zustand store (for sidebar refresh)
  useEffect(() => {
    if (metaConversationId && metaConversationId !== useChatStore.getState().conversationId) {
      useChatStore.setState({ conversationId: metaConversationId });
      // Refresh conversations list so sidebar shows the new conversation
      useChatStore.getState().loadConversations();
    }
  }, [metaConversationId]);

  // Load a past conversation: fetch from Zustand then inject into AI SDK
  const loadConversation = useCallback(
    async (id: string) => {
      await storeLoadConversation(id);
      const storeMessages = useChatStore.getState().messages;
      // Convert BotMessage[] → UIMessage[]
      const aiMessages: ChatUIMessage[] = storeMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }));
      aiChat.setMessages(aiMessages);
      // Set the conversationId ref so subsequent messages go to same conversation
      currentConvIdRef.current = id;
    },
    [storeLoadConversation, aiChat],
  );

  const clear = useCallback(() => {
    aiChat.setMessages([]);
    currentConvIdRef.current = null;
    useChatStore.setState({ conversationId: null });
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
    conversationId,
    suggestions,
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
    conversationId,
    suggestions,
    aiChat.error,
    send,
    clear,
    loadConversation,
    loadConversations,
    conversations,
    deleteConversation,
  ]);
}
