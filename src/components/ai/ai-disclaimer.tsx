import { cn } from '@/lib/utils';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export interface AIDisclaimerProps {
  variant?: 'banner' | 'inline';
  className?: string;
}

export function AIDisclaimer({ variant = 'inline', className }: AIDisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl bg-info/10 px-2 py-2 text-xs text-info',
          className,
        )}
        role="note"
      >
        <InformationCircleIcon className="h-4 w-4 shrink-0" />
        <p>AI 예측은 참고용이며, 실제 입소 결과와 다를 수 있습니다.</p>
      </div>
    );
  }

  return (
    <p className={cn('text-[10px] text-text-tertiary', className)} role="note">
      AI 예측은 참고용입니다. 정확한 정보는 관할 지자체에 문의하세요.
    </p>
  );
}
