import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton variant="rectangular" className="h-12" />
      <Skeleton variant="card" />
      <div className="space-y-2">
        <Skeleton variant="rectangular" className="h-16" />
        <Skeleton variant="rectangular" className="h-16" />
        <Skeleton variant="rectangular" className="h-16" />
      </div>
      <Skeleton variant="card" />
    </div>
  );
}
