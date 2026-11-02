"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { triggerTopLoader } from "@/components/common/top-loader";
import { cn } from "@/lib/utils";

export type PillTab = {
  label: string;
  href: string;
  active?: boolean;
  count?: number;
};

/**
 * Pill tab strip — interactive, non-blocking navigation with instant optimistic
 * active state and prefetching for zero-latency tab switching.
 */
export function PillTabs({
  tabs,
  className,
}: {
  tabs: PillTab[];
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  // Clear optimistic state when transition finishes
  useEffect(() => {
    if (!isPending) {
      setOptimisticHref(null);
    }
  }, [isPending]);

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // Allow new-tab clicks
    e.preventDefault();

    setOptimisticHref(href);
    triggerTopLoader(href);

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  const handleMouseEnter = (href: string) => {
    router.prefetch(href);
  };

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = optimisticHref ? tab.href === optimisticHref : tab.active;
        const isCurrentPending = isPending && optimisticHref === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            scroll={false}
            onClick={(e) => handleTabClick(e, tab.href)}
            onMouseEnter={() => handleMouseEnter(tab.href)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-all cursor-pointer",
              isActive
                ? "bg-[#ffcc00] font-bold text-black shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCurrentPending && "opacity-90",
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums",
                  isActive
                    ? "bg-black/15 text-black"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
