'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface ChatMetadata {
  conversation_id?: string;
  suggestions?: string[];
}

/** Runtime type guard — avoids unsafe `as` cast on AI SDK metadata. */
function isChatMetadata(v: unknown): v is ChatMetadata {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  if ('conversation_id' in obj && typeof obj.conversation_id !== 'string') return false;
  if ('suggestions' in obj && !Array.isArray(obj.suggestions)) return false;
  return 'conversation_id' in obj || 'suggestions' in obj;
}

export function useChat() {
  // Track current conversationId for dynamic transport body
  const currentConvIdRef = useRef<string | null>(null);

  // Suggestions from the latest assistant response (UI-only, no persistence)
  const [suggestions, setSuggestions] = useState<string[]>([]);

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

  const aiChat = useAIChat({
    transport: chatTransport,
    onFinish: ({ message }) => {
      if (!isChatMetadata(message.metadata)) return;
      const meta = message.metadata;

      // Sync conversation_id directly to Zustand (single source of truth)
      if (meta.conversation_id) {
        useChatStore.setState({ conversationId: meta.conversation_id });
        useChatStore.getState().loadConversations();
      }

      if (meta.suggestions) {
        setSuggestions(meta.suggestions.filter((s): s is string => typeof s === 'string'));
      }
    },
  });

  // Conversation CRUD from Zustand store
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const storeLoadConversation = useChatStore((s) => s.loadConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  // Single source of truth: Zustand selector (reactive subscription)
  const conversationId = useChatStore((s) => s.conversationId);

  // Keep ref in sync for dynamic body (useEffect for concurrent mode safety)
  useEffect(() => {
    currentConvIdRef.current = conversationId;
  }, [conversationId]);

  // Load a past conversation: fetch from Zustand then inject into AI SDK
  const loadConversation = useCallback(
    async (id: string) => {
      await storeLoadConversation(id);
      const storeMessages = useChatStore.getState().messages;
      const aiMessages: UIMessage[] = storeMessages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
      }));
      aiChat.setMessages(aiMessages);
      currentConvIdRef.current = id;
      setSuggestions([]);
    },
    [storeLoadConversation, aiChat],
  );

  const clear = useCallback(() => {
    aiChat.setMessages([]);
    currentConvIdRef.current = null;
    setSuggestions([]);
    useChatStore.setState({ conversationId: null });
  }, [aiChat]);

  // Send a text message (compatible with ChatInput's onSend)
  const send = useCallback(
    (text: string) => {
      setSuggestions([]); // Clear stale suggestions from previous response
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
