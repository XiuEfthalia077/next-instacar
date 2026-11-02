import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col gap-2 pb-4 border-b border-border">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-7 w-48 rounded-lg" />
      </div>

      {/* Welcome Banner */}
      <Skeleton className="h-44 w-full rounded-3xl" />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      {/* Recent items grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
