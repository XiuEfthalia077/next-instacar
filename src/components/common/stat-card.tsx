import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<StatCardTone, string> = {
  default:
    "border-border bg-card text-foreground [&_.stat-icon]:bg-[#ffcc00]/12 [&_.stat-icon]:text-[#b38a00] dark:[&_.stat-icon]:text-[#ffd700]",
  primary:
    "border-[#ffcc00]/40 bg-[#fffbe6] text-foreground dark:bg-[#1a1600] [&_.stat-icon]:bg-[#ffcc00] [&_.stat-icon]:text-black",
  success:
    "border-emerald-200 bg-emerald-50 text-foreground dark:border-emerald-900 dark:bg-emerald-950/40 [&_.stat-icon]:bg-emerald-500 [&_.stat-icon]:text-white",
  warning:
    "border-amber-200 bg-amber-50 text-foreground dark:border-amber-900 dark:bg-amber-950/40 [&_.stat-icon]:bg-amber-500 [&_.stat-icon]:text-black",
  danger:
    "border-rose-200 bg-rose-50 text-foreground dark:border-rose-900 dark:bg-rose-950/40 [&_.stat-icon]:bg-rose-500 [&_.stat-icon]:text-white",
  info: "border-sky-200 bg-sky-50 text-foreground dark:border-sky-900 dark:bg-sky-950/40 [&_.stat-icon]:bg-sky-500 [&_.stat-icon]:text-white",
};

/**
 * KPI tile used across every dashboard page (legacy `stat-card`).
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatCardTone;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 border p-4 shadow-sm", TONES[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>

        {Icon ? (
          <span className="stat-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
