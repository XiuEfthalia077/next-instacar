import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "cyan";

const TONE_CONFIG: Record<
  StatCardTone,
  {
    iconBg: string;
    iconColor: string;
    defaultValueColor: string;
  }
> = {
  default: {
    iconBg: "bg-zinc-800 text-zinc-300",
    iconColor: "text-zinc-300",
    defaultValueColor: "text-white",
  },
  primary: {
    iconBg: "bg-amber-500/15 text-[#ffcc00]",
    iconColor: "text-[#ffcc00]",
    defaultValueColor: "text-white",
  },
  success: {
    iconBg: "bg-emerald-500/15 text-emerald-400",
    iconColor: "text-emerald-400",
    defaultValueColor: "text-emerald-400",
  },
  warning: {
    iconBg: "bg-amber-500/15 text-amber-400",
    iconColor: "text-amber-400",
    defaultValueColor: "text-amber-400",
  },
  danger: {
    iconBg: "bg-rose-500/15 text-rose-400",
    iconColor: "text-rose-400",
    defaultValueColor: "text-rose-400",
  },
  info: {
    iconBg: "bg-sky-500/15 text-sky-400",
    iconColor: "text-sky-400",
    defaultValueColor: "text-sky-400",
  },
  cyan: {
    iconBg: "bg-cyan-500/15 text-cyan-400",
    iconColor: "text-cyan-400",
    defaultValueColor: "text-cyan-400",
  },
  purple: {
    iconBg: "bg-purple-500/15 text-purple-400",
    iconColor: "text-purple-400",
    defaultValueColor: "text-purple-400",
  },
};

export interface StatCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatCardTone;
  valueClassName?: string;
  className?: string;
}

/**
 * Unified shadcn Stats Card Component
 * Reproduces the exact Profit Analytics card design:
 * - Rounded zinc card shell with dark backdrop
 * - Top row: uppercase title on left, circular icon badge on right
 * - Metric value: full-width, responsive bold typography
 * - Subtitle / hint: subtle secondary description below
 */
export function StatCard({
  label,
  title,
  value,
  hint,
  subtitle,
  icon: Icon,
  tone = "default",
  valueClassName,
  className,
}: StatCardProps) {
  const displayTitle = label ?? title ?? "";
  const displayHint = hint ?? subtitle;
  const config = TONE_CONFIG[tone] || TONE_CONFIG.default;

  return (
    <Card
      className={cn(
        "gap-0 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-sm transition hover:border-zinc-700 w-full",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {displayTitle}
        </span>
        {Icon ? (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              config.iconBg,
            )}
          >
            <Icon className={cn("size-4 shrink-0", config.iconColor)} />
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-2 truncate text-xl sm:text-2xl font-black tracking-tight",
          valueClassName || config.defaultValueColor,
        )}
      >
        {value}
      </div>

      {displayHint ? (
        <div className="mt-1 line-clamp-2 text-xs text-zinc-400">
          {displayHint}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Responsive grid container for StatCard components.
 * Automatically stacks:
 * - 1 column on mobile (< 640px)
 * - 2 columns on tablet (sm: 640px - 1024px)
 * - 4 columns on desktop (lg: 1024px+)
 */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
