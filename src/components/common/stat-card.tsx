import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const TONES: Record<StatCardTone, string> = {
  default:
    "border-border bg-card text-foreground hover:border-[#ffcc00]/50 hover:shadow-lg hover:shadow-black/20 dark:bg-[#14181f]/80 dark:border-white/10 dark:hover:border-[#ffcc00]/50 [&_.stat-icon]:bg-[#ffcc00]/15 [&_.stat-icon]:text-[#ffd700]",
  primary:
    "border-[#ffcc00]/40 bg-[#fffbe6] text-foreground dark:bg-[#1a1600]/80 dark:border-[#ffcc00]/40 hover:shadow-lg hover:shadow-[#ffcc00]/10 [&_.stat-icon]:bg-[#ffcc00] [&_.stat-icon]:text-black [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-[#ffcc00]/30",
  success:
    "border-emerald-200 bg-emerald-50 text-foreground dark:border-emerald-800/50 dark:bg-emerald-950/30 hover:shadow-lg hover:shadow-emerald-950/30 [&_.stat-icon]:bg-emerald-500 [&_.stat-icon]:text-white [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-emerald-500/30",
  warning:
    "border-amber-200 bg-amber-50 text-foreground dark:border-amber-800/50 dark:bg-amber-950/30 hover:shadow-lg hover:shadow-amber-950/30 [&_.stat-icon]:bg-amber-500 [&_.stat-icon]:text-black [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-amber-500/30",
  danger:
    "border-rose-200 bg-rose-50 text-foreground dark:border-rose-800/50 dark:bg-rose-950/30 hover:shadow-lg hover:shadow-rose-950/30 [&_.stat-icon]:bg-rose-500 [&_.stat-icon]:text-white [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-rose-500/30",
  info:
    "border-sky-200 bg-sky-50 text-foreground dark:border-sky-800/50 dark:bg-sky-950/30 hover:shadow-lg hover:shadow-sky-950/30 [&_.stat-icon]:bg-sky-500 [&_.stat-icon]:text-white [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-sky-500/30",
  purple:
    "border-violet-200 bg-violet-50 text-foreground dark:border-violet-800/50 dark:bg-violet-950/30 hover:shadow-lg hover:shadow-violet-950/30 [&_.stat-icon]:bg-violet-500 [&_.stat-icon]:text-white [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-violet-500/30",
};

/**
 * KPI tile used across every dashboard page with refined dark-theme glow and smooth hover transitions.
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
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-default",
        TONES[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover:text-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 truncate text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-current opacity-60" />
              {hint}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <span className="stat-icon flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
