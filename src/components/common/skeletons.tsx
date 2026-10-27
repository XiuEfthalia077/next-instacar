import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for Vehicle Gallery (`/user/cars`).
 * Accurately mimics the filter bar and the responsive 3-column vehicle card grid.
 */
export function GalleryGridSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 1. Header & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted/80" />
          <div className="h-4 w-64 rounded-md bg-muted/50" />
        </div>
        <div className="h-10 w-full sm:w-80 rounded-xl bg-muted/60" />
      </div>

      {/* 2. Filter Bar Box */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* Top 4 dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-muted/60" />
              <div className="h-10 w-full rounded-xl bg-muted/40" />
            </div>
          ))}
        </div>

        {/* Date pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted/60" />
            <div className="h-10 w-full rounded-xl bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted/60" />
            <div className="h-10 w-full rounded-xl bg-muted/40" />
          </div>
        </div>

        {/* Bottom counters */}
        <div className="flex items-center justify-between pt-1 border-t border-border/60">
          <div className="h-4 w-40 rounded bg-muted/50" />
          <div className="h-8 w-24 rounded-lg bg-muted/40" />
        </div>
      </div>

      {/* 3. Responsive Vehicle Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
          >
            {/* Image Placeholder */}
            <div className="relative aspect-[16/10] w-full bg-muted/70 flex items-center justify-center">
              <div className="absolute top-3 left-3 flex gap-1.5">
                <div className="h-5 w-16 rounded-full bg-muted/90" />
                <div className="h-5 w-20 rounded-full bg-muted/90" />
              </div>
              <div className="absolute top-3 right-3">
                <div className="h-5 w-16 rounded-full bg-muted/90" />
              </div>
            </div>

            {/* Content Body */}
            <div className="flex flex-1 flex-col p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="h-5 w-32 rounded bg-muted/80" />
                  <div className="h-3.5 w-24 rounded bg-muted/50" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-5 w-20 rounded bg-muted/80 ml-auto" />
                  <div className="h-2.5 w-16 rounded bg-muted/40 ml-auto" />
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-2 border-y border-border/70 py-2.5">
                <div className="h-4 w-12 mx-auto rounded bg-muted/60" />
                <div className="h-4 w-12 mx-auto rounded bg-muted/60" />
                <div className="h-4 w-12 mx-auto rounded bg-muted/60" />
              </div>

              {/* Rates */}
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-20 rounded bg-muted/50" />
                <div className="h-3.5 w-20 rounded bg-muted/50" />
              </div>

              {/* Buttons */}
              <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                <div className="h-9 w-full rounded-xl bg-muted/60" />
                <div className="h-9 w-full rounded-xl bg-[#ffcc00]/40" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Table pages (e.g. `/user/mybookings`, `/admin/bookings`, `/shared/bookings`).
 */
export function TablePageSkeleton({
  kpiCount = 3,
  rowCount = 5,
}: {
  kpiCount?: number;
  rowCount?: number;
}) {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded-lg bg-muted/80" />
          <div className="h-3.5 w-64 rounded-md bg-muted/50" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-muted/60" />
      </div>

      {/* KPI Tiles */}
      {kpiCount > 0 ? (
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-${Math.min(kpiCount, 4)}`}>
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex items-center justify-between"
            >
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted/50" />
                <div className="h-7 w-24 rounded bg-muted/80" />
              </div>
              <div className="size-10 rounded-xl bg-muted/40" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Filter Bar */}
      <div className="h-14 rounded-2xl border border-border bg-card p-3 flex items-center justify-between gap-3">
        <div className="h-8 flex-1 max-w-sm rounded-lg bg-muted/50" />
        <div className="h-8 w-28 rounded-lg bg-muted/50" />
        <div className="h-8 w-20 rounded-lg bg-muted/70" />
      </div>

      {/* Table Box */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Table Header Row */}
        <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-muted/70" />
          <div className="h-4 w-32 rounded bg-muted/70" />
          <div className="h-4 w-24 rounded bg-muted/70" />
          <div className="h-4 w-20 rounded bg-muted/70" />
          <div className="h-4 w-16 rounded bg-muted/70" />
        </div>

        {/* Table Data Rows */}
        <div className="divide-y divide-border/60">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/60 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-muted/70" />
                  <div className="h-3 w-20 rounded bg-muted/40" />
                </div>
              </div>
              <div className="space-y-1 text-center">
                <div className="h-4 w-24 rounded bg-muted/60 mx-auto" />
                <div className="h-3 w-16 rounded bg-muted/40 mx-auto" />
              </div>
              <div className="h-6 w-20 rounded-full bg-muted/50" />
              <div className="h-4 w-16 rounded bg-muted/70" />
              <div className="h-8 w-20 rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
