import { Skeleton } from "@/components/ui/skeleton";

export default function FleetLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex flex-col gap-2 pb-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-4 w-80 max-w-full rounded-md mt-1" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-14 w-full rounded-2xl" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
