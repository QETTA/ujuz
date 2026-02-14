'use client';

interface EvidenceLabelProps {
  dataSource: string;
  lastUpdated: string | Date;
  uncertaintyRange?: { low: number; high: number };
  className?: string;
}

export default function EvidenceLabel({
  dataSource,
  lastUpdated,
  uncertaintyRange,
  className = '',
}: EvidenceLabelProps) {
  const updatedDate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60));

  const freshness =
    diffHours < 1 ? '방금 전' :
    diffHours < 24 ? `${diffHours}시간 전` :
    diffHours < 168 ? `${Math.floor(diffHours / 24)}일 전` :
    `${Math.floor(diffHours / 168)}주 전`;

  const freshnessColor =
    diffHours < 24 ? 'text-green-600 dark:text-green-400' :
    diffHours < 168 ? 'text-yellow-600 dark:text-yellow-400' :
    'text-red-600 dark:text-red-400';

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {dataSource}
      </span>
      <span className={`inline-flex items-center gap-1 ${freshnessColor}`}>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        갱신: {freshness}
      </span>
      {uncertaintyRange && (
        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          신뢰구간: {uncertaintyRange.low}~{uncertaintyRange.high}%
        </span>
      )}
    </div>
  );
}
