import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { DataBlockCard } from '@/components/ai/data-block-card';
import type { UIMessage } from 'ai';

interface DataBlock {
  type: string;
  title: string;
  content: string;
  confidence: number;
  source?: string;
}

interface ChatBubbleProps {
  message: UIMessage & {
    data_blocks?: DataBlock[];
    created_at?: string;
  };
  className?: string;
}

/**
 * Extract plain text from a UIMessage's parts array.
 */
function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatBubble({ message, className }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const textContent = getTextContent(message);

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start', className)}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'rounded-br-sm bg-brand-500 text-text-inverse'
            : 'rounded-bl-sm bg-surface-elevated text-text-primary',
        )}
      >
        {/* Main content */}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{textContent}</p>

        {/* Data blocks */}
        {message.data_blocks && message.data_blocks.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.data_blocks.map((block, i) => (
              <DataBlockCard
                key={`${block.type}-${i}`}
                type={block.type}
                title={block.title}
                content={block.content}
                confidence={block.confidence}
                source={block.source}
                className={isUser ? 'border-brand-400/30 bg-brand-600/20' : undefined}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        {message.created_at && (
          <p
            className={cn(
              'mt-1 text-[10px]',
              isUser ? 'text-text-inverse/60' : 'text-text-tertiary',
            )}
          >
            {formatRelativeTime(message.created_at)}
          </p>
        )}
      </div>
    </div>
  );
}
