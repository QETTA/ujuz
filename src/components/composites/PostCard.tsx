import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { Chip } from '@/components/primitives/Chip';
import { ChatBubbleLeftIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';

interface PostCardProps {
  id: string;
  type: 'review' | 'to_report' | 'question';
  content: string;
  authorNickname?: string;
  createdAt: string;
  likes?: number;
  commentCount?: number;
  structuredFields?: {
    age_class?: string;
    wait_months?: number;
    facility_type?: string;
  };
  onClick?: () => void;
  className?: string;
}

const TYPE_LABELS: Record<string, { label: string; variant: 'brand' | 'success' | 'warning' }> = {
  review: { label: '후기', variant: 'brand' },
  to_report: { label: 'TO 제보', variant: 'success' },
  question: { label: '질문', variant: 'warning' },
};

export function PostCard({
  type,
  content,
  authorNickname,
  createdAt,
  likes = 0,
  commentCount = 0,
  structuredFields,
  onClick,
  className,
}: PostCardProps) {
  const typeMeta = TYPE_LABELS[type] ?? TYPE_LABELS.review;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-border bg-surface p-4 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:bg-surface-inset hover:border-brand-200 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:active:scale-100',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Chip variant={typeMeta.variant}>{typeMeta.label}</Chip>
        {structuredFields?.age_class && (
          <Chip>{structuredFields.age_class}</Chip>
        )}
        {structuredFields?.wait_months != null && (
          <Chip>대기 {structuredFields.wait_months}개월</Chip>
        )}
      </div>

      {/* Content */}
      <p className="mt-2 text-sm text-text-primary line-clamp-3">{content}</p>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 text-xs text-text-tertiary">
        {authorNickname && <span>{authorNickname}</span>}
        <span>{formatRelativeTime(createdAt)}</span>
        <span className="flex items-center gap-0.5">
          <HandThumbUpIcon className="h-3.5 w-3.5" /> {likes}
        </span>
        <span className="flex items-center gap-0.5">
          <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> {commentCount}
        </span>
      </div>
    </button>
  );
}
