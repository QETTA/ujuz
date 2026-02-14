/**
 * Thin wrapper: converts BotMessage to UIMessage and delegates to the
 * primary ChatBubble in composites/. This avoids maintaining two separate
 * bubble implementations.
 */
import { ChatBubble as PrimaryChatBubble } from '@/components/composites/ChatBubble';
import type { BotMessage } from '@/lib/types';

export interface ChatBubbleProps {
  message: BotMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  // Adapt BotMessage to the UIMessage shape expected by PrimaryChatBubble
  const adapted = {
    id: message.id,
    role: message.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: message.content }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data_blocks: message.data_blocks as any,
    created_at: message.created_at,
  };

  return <PrimaryChatBubble message={adapted as any} />;
}
