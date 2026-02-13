'use client';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { ConversationSummary } from '@/lib/types';
import { ChatBubbleLeftIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ConversationListItemProps {
  conversation: ConversationSummary;
  isActive?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  className?: string;
}

export function ConversationListItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  className,
}: ConversationListItemProps) {
  const unreadMeta = conversation as ConversationSummary & {
    unread?: boolean;
    has_unread?: boolean;
    unread_count?: number;
  };

  const hasUnread = Boolean(
    unreadMeta.unread
    ?? unreadMeta.has_unread
    ?? (typeof unreadMeta.unread_count === 'number' && unreadMeta.unread_count > 0),
  );

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 transition-all duration-200',
        isActive ? 'border-brand-500 bg-brand-50' : 'hover:bg-muted/50',
        className,
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <ChatBubbleLeftIcon className="h-5 w-5 shrink-0 text-text-tertiary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{conversation.title}</p>
          <p className="text-xs text-text-tertiary truncate">{conversation.last_message}</p>
        </div>
        {hasUnread && (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-blue-500 animate-pulse"
            aria-label="읽지 않은 메시지"
          />
        )}
        <span className="shrink-0 text-[10px] text-text-tertiary">
          {formatRelativeTime(conversation.updated_at)}
        </span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded-lg p-1.5 text-text-tertiary opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.98]"
          aria-label="대화 삭제"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
