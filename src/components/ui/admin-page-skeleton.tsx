import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standardized KPI Metric Card Skeleton matching StatCard dimensions exactly:
 * - Rounded-2xl card with border
 * - Title placeholder (left) + circular badge placeholder (right)
 * - Metric value placeholder
 * - Subtitle / hint placeholder
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 w-full animate-pulse",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="h-3 w-24 rounded-md bg-muted/70 dark:bg-zinc-800/80" />
        <div className="size-8 rounded-full bg-muted/60 dark:bg-zinc-800/60 shrink-0" />
      </div>
      <div className="mt-3 h-7 w-28 rounded-lg bg-muted/80 dark:bg-zinc-700/80" />
      <div className="mt-2.5 h-3.5 w-36 rounded-md bg-muted/50 dark:bg-zinc-800/50" />
    </div>
  );
}

/**
 * Responsive 4-card KPI metric strip container matching StatGrid.
 */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Filter / Search toolbar skeleton.
 */
export function ToolbarSkeleton() {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-2 sm:p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 animate-pulse">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="h-9 w-full sm:w-64 rounded-xl bg-muted/70 dark:bg-zinc-800/70" />
        <div className="h-9 w-28 rounded-xl bg-muted/60 dark:bg-zinc-800/60" />
        <div className="h-9 w-28 rounded-xl bg-muted/60 dark:bg-zinc-800/60" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 w-24 rounded-xl bg-muted/70 dark:bg-zinc-800/70" />
      </div>
    </div>
  );
}

/**
 * Tab strip skeleton matching PillTabs / FinancialTabs.
 */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-8 rounded-lg bg-muted/60 dark:bg-zinc-800/60",
            i === 0 ? "w-28 bg-muted/90 dark:bg-zinc-700/80" : "w-24",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Standard data table skeleton with column headers and rows.
 */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 overflow-hidden animate-pulse">
      {/* Table Header */}
      <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/40 px-4 py-3 sm:px-6">
        <div className="h-4 w-28 rounded bg-muted/80 dark:bg-zinc-700/80" />
        <div className="hidden sm:flex gap-8">
          <div className="h-4 w-20 rounded bg-muted/60 dark:bg-zinc-800/60" />
          <div className="h-4 w-24 rounded bg-muted/60 dark:bg-zinc-800/60" />
          <div className="h-4 w-16 rounded bg-muted/60 dark:bg-zinc-800/60" />
        </div>
        <div className="h-4 w-16 rounded bg-muted/60 dark:bg-zinc-800/60" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border dark:divide-zinc-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3.5 sm:px-6"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-muted/70 dark:bg-zinc-800/70 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 sm:w-44 rounded bg-muted/80 dark:bg-zinc-700/80" />
                <div className="h-2.5 w-24 rounded bg-muted/50 dark:bg-zinc-800/50" />
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-8">
              <div className="h-3 w-20 rounded bg-muted/50 dark:bg-zinc-800/50" />
              <div className="h-5 w-24 rounded-full bg-muted/60 dark:bg-zinc-800/60" />
              <div className="h-3.5 w-16 rounded bg-muted/70 dark:bg-zinc-700/70" />
            </div>

            <div className="h-7 w-20 rounded-lg bg-muted/60 dark:bg-zinc-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Unified Tab Content Skeleton:
 * Used inside `<Suspense fallback={<TabContentSkeleton />}>` under existing static tab headers.
 */
export function TabContentSkeleton({
  showKpis = true,
  kpiCount = 4,
  showToolbar = true,
  tableRows = 6,
}: {
  showKpis?: boolean;
  kpiCount?: number;
  showToolbar?: boolean;
  tableRows?: number;
}) {
  return (
    <div className="space-y-4">
      {showKpis && <StatGridSkeleton count={kpiCount} />}
      {showToolbar && <ToolbarSkeleton />}
      <TableSkeleton rows={tableRows} />
    </div>
  );
}

/**
 * Reusable Unified Admin Page Skeleton Primitive:
 * Standardizes loading across all admin routes with zero layout shift (CLS).
 */
export function AdminPageSkeleton({
  titleWidth = "w-48",
  subtitleWidth = "w-24",
  showKpis = true,
  kpiCount = 4,
  showTabs = false,
  tabCount = 4,
  showToolbar = true,
  tableRows = 6,
  className,
}: {
  titleWidth?: string;
  subtitleWidth?: string;
  showKpis?: boolean;
  kpiCount?: number;
  showTabs?: boolean;
  tabCount?: number;
  showToolbar?: boolean;
  tableRows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      {/* 1. Header row skeleton (Page title + breadcrumb + action button placeholders) */}
      <div className="mb-4 sm:mb-5 flex flex-col gap-3 border-b border-border pb-3 sm:pb-4 sm:flex-row sm:items-end sm:justify-between w-full">
        <div className="min-w-0 flex-1 space-y-2">
          <div className={cn("h-3 rounded-md bg-muted/60 dark:bg-zinc-800/60", subtitleWidth)} />
          <div className={cn("h-7 sm:h-8 rounded-lg bg-muted/90 dark:bg-zinc-700/90", titleWidth)} />
          <div className="h-3.5 w-72 max-w-full rounded-md bg-muted/50 dark:bg-zinc-800/50" />
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
          <div className="h-9 w-28 rounded-xl bg-muted/70 dark:bg-zinc-800/70" />
          <div className="h-9 w-24 rounded-xl bg-muted/70 dark:bg-zinc-800/70" />
        </div>
      </div>

      {/* 2. Optional Tab Strip */}
      {showTabs && <TabsSkeleton count={tabCount} />}

      {/* 3. 4-card KPI metric skeleton strip (matching StatCard dimensions) */}
      {showKpis && <StatGridSkeleton count={kpiCount} />}

      {/* 4. Filter / search toolbar skeleton */}
      {showToolbar && <ToolbarSkeleton />}

      {/* 5. Data table or card grid skeleton */}
      <TableSkeleton rows={tableRows} />
    </div>
  );
}
export default AdminPageSkeleton;
