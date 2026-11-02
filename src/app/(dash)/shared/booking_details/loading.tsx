export default function BookingDetailsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex flex-col gap-3 border-b border-border pb-3 sm:pb-4 sm:flex-row sm:items-end sm:justify-between w-full">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-28 rounded-md bg-muted/60 dark:bg-zinc-800/60" />
          <div className="h-7 sm:h-8 w-64 rounded-lg bg-muted/90 dark:bg-zinc-700/90" />
          <div className="h-3.5 w-80 max-w-full rounded-md bg-muted/50 dark:bg-zinc-800/50" />
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
          <div className="h-9 w-28 rounded-xl bg-muted/70 dark:bg-zinc-800/70" />
          <div className="h-9 w-24 rounded-xl bg-muted/70 dark:bg-zinc-800/70" />
        </div>
      </div>

      {/* Badges row */}
      <div className="flex gap-2 mb-2">
        <div className="h-6 w-24 rounded-full bg-muted/70 dark:bg-zinc-800/70" />
        <div className="h-6 w-20 rounded-full bg-muted/50 dark:bg-zinc-800/50" />
      </div>

      {/* 2-Column layout matching booking details */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-56 w-full rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/90 shadow-xs" />
          <div className="h-48 w-full rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/90 shadow-xs" />
          <div className="h-48 w-full rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/90 shadow-xs" />
        </div>
        <div className="space-y-4">
          <div className="h-48 w-full rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/90 shadow-xs" />
          <div className="h-64 w-full rounded-2xl border border-border bg-card dark:border-zinc-800 dark:bg-zinc-900/90 shadow-xs" />
        </div>
      </div>
    </div>
  );
}
