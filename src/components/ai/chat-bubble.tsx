import { cn } from '@/lib/utils';
import type { BotMessage } from '@/lib/types';

export interface ChatBubbleProps {
  message: BotMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-br-md bg-brand-500 text-text-inverse'
            : 'rounded-bl-md bg-surface-elevated text-text-primary',
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.data_blocks && message.data_blocks.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-border-subtle pt-2">
            {message.data_blocks.map((block, i) => (
              <div key={i} className="rounded-lg bg-surface-inset p-2 text-xs">
                <p className="font-medium">{block.title}</p>
                <p className="mt-0.5 text-text-secondary">{block.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
