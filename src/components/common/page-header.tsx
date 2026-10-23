import { cn } from "@/lib/utils";

/**
 * Page heading used by every dashboard page.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {subtitle ? (
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary">
            {subtitle}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
