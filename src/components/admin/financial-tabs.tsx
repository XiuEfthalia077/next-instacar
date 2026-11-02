"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, DollarSign, Receipt, TrendingUp } from "lucide-react";

import { triggerTopLoader } from "@/components/common/top-loader";
import { cn } from "@/lib/utils";

export const FINANCIAL_TABS = [
  { id: "overview", label: "Fleet Overview", icon: BarChart3, desc: "Key performance indicators, gross remittances, and fleet overview" },
  { id: "revenue", label: "Monthly Revenue", icon: TrendingUp, desc: "Breakdown of rental revenue and platform fees by vehicle and month" },
  { id: "expenses", label: "Maintenance & Expenses", icon: DollarSign, desc: "Track fleet repairs, routine servicing, and operating expenses" },
  { id: "income", label: "Income Statement", icon: Receipt, desc: "Annual and monthly profit & loss telemetry across all vehicles" },
] as const;

export type FinancialTabId = (typeof FINANCIAL_TABS)[number]["id"];

export function buildFinancialTabHref(
  tabId: string,
  currentParams: Record<string, string | string[] | undefined>,
) {
  const p = new URLSearchParams();
  p.set("tab", tabId);
  for (const [key, val] of Object.entries(currentParams)) {
    if (key === "tab" || !val) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => p.append(key, v));
    } else {
      p.set(key, val);
    }
  }
  return `/admin/financials?${p.toString()}`;
}

export function FinancialTabs({
  activeTab,
  currentParams,
}: {
  activeTab: string;
  currentParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) {
      setOptimisticTab(null);
    }
  }, [isPending]);

  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, tabId: string, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();

    setOptimisticTab(tabId);
    triggerTopLoader(href);

    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  const handleMouseEnter = (href: string) => {
    router.prefetch(href);
  };

  const currentActive = optimisticTab ?? activeTab;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1 shadow-xs">
      {FINANCIAL_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentActive === tab.id;
        const href = buildFinancialTabHref(tab.id, currentParams);

        return (
          <Link
            key={tab.id}
            href={href}
            onClick={(e) => handleTabClick(e, tab.id, href)}
            onMouseEnter={() => handleMouseEnter(href)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
              isActive
                ? "bg-[#ffcc00] text-black shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              isPending && optimisticTab === tab.id && "opacity-90",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
