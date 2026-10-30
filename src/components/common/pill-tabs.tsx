import Link from "next/link";

import { cn } from "@/lib/utils";

export type PillTab = {
  label: string;
  href: string;
  active?: boolean;
  count?: number;
};

/**
 * Pill tab strip — the legacy `.nav-status-pills` filter used on the booking
 * and settlement listings.
 */
export function PillTabs({
  tabs,
  className,
}: {
  tabs: PillTab[];
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm",
        className,
      )}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          scroll={false}
          data-no-loader="true"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors",
            tab.active
              ? "bg-[#ffcc00] font-bold text-black"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums",
                tab.active
                  ? "bg-black/15 text-black"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
