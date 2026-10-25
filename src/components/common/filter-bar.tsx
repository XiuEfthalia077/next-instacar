import { cn } from "@/lib/utils";

/**
 * The white filter card above every listing (`filter-card` in the legacy
 * pages). Children are laid out in a responsive row.
 */
export function FilterBar({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      className={cn(
        "mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4",
        className,
      )}
      method="get"
    >
      <div className="flex flex-wrap items-end gap-3">
        {children}
        {actions ? (
          <div className="flex items-end gap-2">{actions}</div>
        ) : null}
      </div>
    </form>
  );
}

/** A labelled filter control inside {@link FilterBar}. */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-[140px] flex-1", className)}>
      <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Shared look for the `select` elements inside a {@link FilterBar}. */
export const filterControlClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50 dark:bg-[#121417] dark:text-foreground";
