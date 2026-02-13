import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton variant="rectangular" className="h-10" />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="h-10 flex-1" />
        <Skeleton variant="rectangular" className="h-10 flex-1" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-28" />
      ))}
    </div>
  );
}
