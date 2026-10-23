import { cn } from "@/lib/utils";

/**
 * Centred empty placeholder — the legacy `.empty-state` block that every
 * listing shows when there are no rows.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-[#ffcc00]/12 text-[#b38a00] dark:text-[#ffd700]">
          <Icon className="size-6" />
        </span>
      ) : null}
      <h3 className="text-base font-extrabold text-foreground">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
