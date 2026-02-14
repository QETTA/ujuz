import { cn } from '@/lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerColor = 'default' | 'muted' | 'white';

export type SpinnerProps = {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  srLabel?: string;
  label?: string;
};

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const colorMap: Record<SpinnerColor, string> = {
  default: 'text-brand-500',
  muted: 'text-text-tertiary',
  white: 'text-text-inverse',
};

export function Spinner({
  size = 'md',
  color = 'default',
  className,
  srLabel = 'Loading',
  label,
}: SpinnerProps) {
  return (
    <span
      className={cn('inline-flex items-center', label ? 'flex-col gap-2' : 'justify-center')}
      role="status"
      aria-label={srLabel}
    >
      <span className="sr-only">{srLabel}</span>
      <svg
        className={cn('animate-spin ease-linear', colorMap[color], sizeMap[size], className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label ? (
        <span className={cn('text-sm', color === 'white' ? 'text-text-inverse' : 'text-text-tertiary')}>
          {label}
        </span>
      ) : null}
    </span>
  );
}
