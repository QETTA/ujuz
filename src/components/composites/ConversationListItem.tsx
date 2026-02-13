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
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isActive ? 'bg-brand-50' : 'hover:bg-surface-inset',
        className,
      )}
    >
      <button type="button" onClick={onSelect} className="flex flex-1 items-center gap-3 text-left min-w-0">
        <ChatBubbleLeftIcon className="h-5 w-5 shrink-0 text-text-tertiary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{conversation.title}</p>
          <p className="text-xs text-text-tertiary truncate">{conversation.last_message}</p>
        </div>
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
          className="shrink-0 rounded-lg p-1.5 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger transition-all"
          aria-label="대화 삭제"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
