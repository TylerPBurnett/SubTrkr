interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonSubscriptionCard() {
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      {/* Amount */}
      <div className="mb-4 space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function SkeletonChartCard() {
  return (
    <div className="card">
      <Skeleton className="h-6 w-40 mb-6" />
      <div className="h-64 flex items-end gap-2 p-4">
        <Skeleton className="flex-1 h-3/4 rounded-t" />
        <Skeleton className="flex-1 h-1/2 rounded-t" />
        <Skeleton className="flex-1 h-5/6 rounded-t" />
        <Skeleton className="flex-1 h-2/3 rounded-t" />
        <Skeleton className="flex-1 h-4/5 rounded-t" />
        <Skeleton className="flex-1 h-1/3 rounded-t" />
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 p-3">
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}
