import { Skeleton } from "@/components/ui/skeleton";

export default function BookingsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md mt-1" />
      </div>

      {/* Filter Bar */}
      <Skeleton className="h-14 w-full rounded-2xl" />

      {/* Table / Card Stack */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
