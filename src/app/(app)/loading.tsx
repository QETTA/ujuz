import { Skeleton } from '@/components/ui/skeleton';

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton variant="rectangular" className="h-12" />
      <Skeleton variant="card" />
      <Skeleton variant="rectangular" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
    </div>
  );
}
