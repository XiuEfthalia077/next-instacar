export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-muted/60" />
          <div className="h-3.5 w-72 rounded-md bg-muted/40" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-muted/50" />
          <div className="h-9 w-28 rounded-xl bg-muted/50" />
        </div>
      </div>

      {/* KPI Tiles Skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted/50" />
                <div className="h-7 w-24 rounded bg-muted/70" />
              </div>
              <div className="size-10 rounded-xl bg-muted/40" />
            </div>
            <div className="mt-3 h-2.5 w-32 rounded bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="h-5 w-40 rounded bg-muted/60" />
          <div className="h-8 w-24 rounded-lg bg-muted/40" />
        </div>

        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/20 p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-muted/60 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-muted/70" />
                  <div className="h-3 w-20 rounded bg-muted/40" />
                </div>
              </div>
              <div className="hidden sm:block space-y-1">
                <div className="h-3.5 w-24 rounded bg-muted/50" />
                <div className="h-2.5 w-16 rounded bg-muted/30" />
              </div>
              <div className="h-6 w-20 rounded-full bg-muted/50" />
              <div className="h-8 w-16 rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
