import { cn } from "@/lib/utils";

/**
 * White content card — the legacy `.table-card` / `.card` wrapper used by
 * every dashboard section.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
  footer,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {title || actions ? (
        <header className="flex flex-col gap-2 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffcc00]/12 text-[#b38a00] dark:text-[#ffd700]">
                <Icon className="size-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate text-sm font-extrabold tracking-tight text-foreground">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      <div className={cn(bodyClassName)}>{children}</div>

      {footer ? (
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground md:px-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
