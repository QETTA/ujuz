import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '@/lib/api';
import { getOrCreateDeviceId } from '@/lib/auth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function makeMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  const [dotTick, setDotTick] = useState(0);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      setDotTick(0);
      return;
    }

    const timer = setInterval(() => {
      setDotTick((prev) => (prev + 1) % 4);
    }, 320);

    return () => {
      clearInterval(timer);
    };
  }, [isStreaming]);

  useEffect(() => {
    if (messages.length === 0) return;
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const applyTextDelta = (assistantId: string, textDelta: string) => {
    if (!textDelta) return;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: `${message.content}${textDelta}`,
            }
          : message,
      ),
    );
  };

  const setAssistantError = (assistantId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: '응답을 불러오지 못했습니다. 다시 시도해 주세요.',
            }
          : message,
      ),
    );
  };

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: makeMessageId(),
      role: 'user',
      content: trimmed,
      createdAt: now,
    };

    const assistantId = makeMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingAssistantId(assistantId);

    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await fetch(`${BASE_URL}/api/bot/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleSseLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) return;

        const data = line.replace(/^data:\s*/, '');
        if (!data || data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          if (parsed?.type === 'text-delta' && typeof parsed.textDelta === 'string') {
            applyTextDelta(assistantId, parsed.textDelta);
            return;
          }
          if (parsed?.type === 'message-metadata' && parsed.metadata) {
            const nextConversationId =
              typeof parsed.metadata.conversationId === 'string'
                ? parsed.metadata.conversationId
                : typeof parsed.metadata.conversation_id === 'string'
                  ? parsed.metadata.conversation_id
                  : undefined;
            if (nextConversationId) {
              setConversationId(nextConversationId);
            }
          }
        } catch {
          return;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          handleSseLine(line);
        }
      }

      if (buffer.trim()) {
        handleSseLine(buffer);
      }
    } catch (error) {
      setAssistantError(assistantId);
    } finally {
      setIsStreaming(false);
      setStreamingAssistantId(null);
    }
  }, [input, isStreaming, conversationId]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      const isStreamingBubble = isStreaming && streamingAssistantId === item.id;
      const streamDots = '.'.repeat(Math.max(1, (dotTick % 3) + 1));
      const bubbleText =
        isStreamingBubble ? `${item.content}${item.content ? streamDots : streamDots}` : item.content;

      return (
        <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
          <View
            className={`max-w-[82%] rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-[#6366f1] rounded-br-sm'
                : 'bg-white border border-slate-200 rounded-bl-sm'
            }`}
          >
            <Text className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-slate-800'}`}>
              {bubbleText}
            </Text>
            <Text
              className={`mt-1 text-xs ${isUser ? 'text-indigo-100' : 'text-slate-400'}`}
            >
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [dotTick, isStreaming, streamingAssistantId],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1">
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted={false}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-6">
                <Text className="text-center text-base text-slate-500">
                  AI 상담사에게 어린이집 입소에 대해 물어보세요
                </Text>
              </View>
            }
            ListFooterComponent={
              isStreaming ? (
                <View className="mb-3 items-start">
                  <View className="max-w-[82%] rounded-2xl rounded-bl-sm bg-slate-200 px-4 py-2">
                    <Text className="text-sm text-slate-700">{'.'.repeat((dotTick % 3) + 1)}</Text>
                  </View>
                </View>
              ) : null
            }
          />
          <View className="border-t border-slate-200 bg-slate-50 px-3 py-2">
            <View className="mb-1 flex-row items-center">
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendMessage}
                placeholder="메시지를 입력하세요"
                className="min-h-12 flex-1 rounded-full border border-slate-300 bg-white px-4 text-slate-900"
                placeholderTextColor="#94a3b8"
                editable={!isStreaming}
                returnKeyType="send"
                textAlignVertical="center"
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!input.trim() || isStreaming}
                className={`ml-2 h-12 w-12 items-center justify-center rounded-full ${
                  !input.trim() || isStreaming ? 'bg-slate-300' : 'bg-[#6366f1]'
                }`}
                activeOpacity={0.8}
              >
                {isStreaming ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-lg font-bold text-white">↑</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
