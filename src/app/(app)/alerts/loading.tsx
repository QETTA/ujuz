import { Skeleton } from '@/components/ui/skeleton';

export default function AlertsLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton variant="rectangular" className="h-12" />
      <Skeleton variant="rectangular" className="h-10" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-24" />
      ))}
    </div>
  );
}
