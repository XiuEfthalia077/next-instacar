import { cn } from "@/lib/utils";

/**
 * Page heading used by every dashboard page with mobile-scaled typography.
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
        "mb-4 sm:mb-5 flex flex-col gap-3 border-b border-border pb-3 sm:pb-4 sm:flex-row sm:items-end sm:justify-between w-full overflow-hidden",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {subtitle ? (
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary">
            {subtitle}
          </p>
        ) : null}
        <h1 className="mt-0.5 text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground break-words">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 max-w-3xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
