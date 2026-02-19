/**
 * Fallback UI shown while lazy-loaded components are being loaded
 * Uses skeleton components for a polished loading experience
 */
import { SkeletonCard, SkeletonChartCard } from './ui/Skeleton';

export function LazyComponentFallback() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stat card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChartCard />
        <SkeletonChartCard />
      </div>
    </div>
  );
}
