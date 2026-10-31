"use client";

import * as React from "react";
import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingRow } from "@/lib/data/bookings";
import { cn } from "@/lib/utils";

export function TodayScheduleCard({
  schedule,
  day,
  title = "Today's Schedule",
  emptyMessage = "No pickups or returns scheduled for today.",
  compact = false,
  className,
}: {
  schedule: BookingRow[];
  day: string;
  title?: string;
  emptyMessage?: string;
  compact?: boolean;
  className?: string;
}) {
  const [openAll, setOpenAll] = React.useState(false);

  const visible = schedule.slice(0, 3);
  const hasMore = schedule.length > 3;

  const renderScheduleItem = (item: BookingRow) => {
    const start = item.start_date ?? "";
    const end = item.end_date ?? "";
    const isPickup = start === day;
    const isReturn = end === day && !isPickup;
    const customer = item.users?.name ?? item.guest_name ?? "Guest";
    const phone = item.users?.phone ?? item.phone_number;

    return (
      <div
        key={item.id}
        className="rounded-xl border border-border bg-card p-3 transition-colors hover:border-[#ffcc00]/50"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                isReturn
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
              )}
            >
              {isPickup ? "Pickup" : isReturn ? "Return" : "Today"}
            </span>
            <p className="truncate text-xs font-bold text-foreground">
              {[item.cars?.brand, item.cars?.model].filter(Boolean).join(" ") || "Vehicle"}
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                ({item.cars?.plate_number ?? "—"})
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={item.status} />
            <Link
              href={`/shared/booking_details?id=${item.id}`}
              className="inline-flex items-center rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:bg-[#ffcc00] hover:text-black min-h-[28px]"
            >
              Details &rarr;
            </Link>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate font-medium">{customer}</span>
          {phone ? <span className="shrink-0 font-mono text-[11px]">☎ {phone}</span> : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <SectionCard
        title={title}
        icon={Clock}
        className={cn("mb-4", className)}
        actions={
          <span className="rounded-full bg-[#ffcc00]/15 px-3 py-1 text-xs font-bold text-[#b38a00] dark:text-[#ffd700]">
            {schedule.length} item{schedule.length === 1 ? "" : "s"}
          </span>
        }
        bodyClassName="p-3"
      >
        {schedule.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={emptyMessage}
            className={compact ? "py-6" : "py-10"}
          />
        ) : (
          <div className="space-y-2">
            {visible.map((item) => renderScheduleItem(item))}

            {hasMore ? (
              <div className="pt-2 text-center border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setOpenAll(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold text-foreground transition-all hover:border-[#ffcc00] hover:bg-[#ffcc00]/10 hover:text-[#b38a00] active:scale-95 cursor-pointer"
                >
                  View All ({schedule.length} Bookings) &rarr;
                </button>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      {/* Complete Scrollable Today's Schedule Modal */}
      <Dialog open={openAll} onOpenChange={setOpenAll}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffd700]">
                <Clock className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Complete list of all {schedule.length} pickup and return schedules for today.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {schedule.map((item) => renderScheduleItem(item))}
          </div>

          <DialogFooter className="mt-4 sm:justify-end">
            <button
              type="button"
              onClick={() => setOpenAll(false)}
              className="rounded-xl border border-border bg-secondary px-5 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition cursor-pointer"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
