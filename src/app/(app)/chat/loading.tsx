import { Skeleton } from '@/components/ui/skeleton';

export default function ChatLoading() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton variant="rectangular" className="h-12" />
      <div className="flex-1 space-y-3">
        <Skeleton variant="rectangular" className="ml-auto h-12 w-2/3" />
        <Skeleton variant="rectangular" className="h-16 w-3/4" />
        <Skeleton variant="rectangular" className="ml-auto h-10 w-1/2" />
        <Skeleton variant="rectangular" className="h-20 w-4/5" />
      </div>
    </div>
  );
}
