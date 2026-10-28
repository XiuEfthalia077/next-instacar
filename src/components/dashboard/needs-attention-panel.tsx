"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronRight, TriangleAlert, Truck } from "lucide-react";
import { BookingAttentionItem } from "@/lib/data/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "instacar_handled_alerts";

export function NeedsAttentionPanel({
  initialItems = [],
}: {
  initialItems: BookingAttentionItem[];
}) {
  const [dismissedKeys, setDismissedKeys] = React.useState<Set<string>>(new Set());
  const [mounted, setMounted] = React.useState(false);

  // Load handled/dismissed alerts from localStorage
  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedKeys(new Set(parsed));
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  const handleDismiss = (item: BookingAttentionItem) => {
    const key = `${item.id}_${item.status}`;
    const next = new Set(dismissedKeys);
    next.add(key);
    setDismissedKeys(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      console.log(
        `[Alert Handled] Booking #${item.id} (${item.customer_name}) status=${item.status} acknowledged.`,
      );
    } catch {
      // Ignore storage errors
    }
  };

  // If not mounted yet, show initial items; once mounted, filter out dismissed
  const activeItems = mounted
    ? initialItems.filter((item) => !dismissedKeys.has(`${item.id}_${item.status}`))
    : initialItems;

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 shadow-xs">
            <TriangleAlert className="size-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-foreground md:text-lg">
                Needs Attention
              </h3>
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-500"
              >
                {activeItems.length} {activeItems.length === 1 ? "Action" : "Actions"} Required
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Overdue releases and returns requiring immediate staff follow-up
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {activeItems.map((item) => {
          const isUrgent = item.alert.severity === "urgent";
          const isRelease = item.alert.type === "release";

          return (
            <div
              key={`${item.id}_${item.status}`}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between",
                isUrgent
                  ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
                  : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50",
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl font-black text-xs",
                    isUrgent
                      ? "bg-rose-500/20 text-rose-500"
                      : "bg-amber-500/20 text-amber-500",
                  )}
                >
                  <AlertCircle className="size-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wider",
                        isRelease
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-500 border border-rose-500/30",
                      )}
                    >
                      {isRelease ? "Overdue for Release" : "Overdue for Return"}
                    </span>
                    <span className="text-xs font-black text-foreground">
                      Booking #{item.id}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-bold text-foreground truncate">
                      {item.customer_name}
                    </span>
                  </div>

                  <p
                    className={cn(
                      "text-xs font-extrabold",
                      isUrgent ? "text-rose-400" : "text-amber-400",
                    )}
                  >
                    {item.alert.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">
                      Vehicle: {item.car_name} ({item.plate_number})
                    </span>
                    <span>•</span>
                    <span>
                      {isRelease ? "Pickup:" : "Return:"}{" "}
                      {isRelease
                        ? `${item.start_date ?? "—"} ${item.pickup_time ?? ""}`
                        : `${item.end_date ?? "—"} ${item.return_time ?? ""}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl bg-[#ffcc00] font-black text-black hover:bg-[#ffd633] transition"
                >
                  <Link href={`/shared/booking_details?id=${item.id}`}>
                    Manage
                    <ChevronRight className="size-3.5 ml-1" />
                  </Link>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismiss(item)}
                  className="rounded-xl border-border text-xs font-semibold hover:bg-muted"
                  title="Mark this alert as acknowledged"
                >
                  <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
