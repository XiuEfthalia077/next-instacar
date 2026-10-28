"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Clock, TriangleAlert } from "lucide-react";
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
import type { ActionCheckItem } from "@/lib/data/bookings";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export function ActionCheckCard({
  items = [],
  title = "Action Check",
  description = "Urgent actions requiring attention today and upcoming warnings for tomorrow.",
  compact = false,
  className,
}: {
  items: ActionCheckItem[];
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  const [openAll, setOpenAll] = React.useState(false);

  const urgentItems = items.filter((i) => i.urgency === "urgent");
  const tomorrowItems = items.filter((i) => i.urgency === "warning");

  const urgentVisible = urgentItems.slice(0, 3);
  const tomorrowVisible = tomorrowItems.slice(0, 3);
  const hasMore = urgentItems.length > 3 || tomorrowItems.length > 3;

  const renderItem = (item: ActionCheckItem) => (
    <div
      key={`${item.id}_${item.actionType}`}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors",
        item.urgency === "urgent"
          ? "border-rose-500/30 bg-card hover:border-rose-500/50"
          : "border-border bg-card hover:border-[#ffcc00]/40",
      )}
    >
      {/* Action Type Badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide shadow-xs",
          item.badgeTone === "danger"
            ? "border border-rose-500/50 bg-rose-500/20 text-rose-300"
            : item.badgeTone === "urgent"
              ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
              : "border border-sky-500/40 bg-sky-500/15 text-sky-300",
        )}
      >
        {item.badgeTone === "danger" ? (
          <TriangleAlert className="size-3.5 shrink-0 text-rose-400 animate-pulse" />
        ) : item.badgeTone === "urgent" ? (
          <AlertCircle className="size-3.5 shrink-0 text-amber-400" />
        ) : (
          <Clock className="size-3.5 shrink-0 text-sky-400" />
        )}
        <span>{item.badgeLabel}</span>
      </span>

      {/* Booking, Customer & Vehicle Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-black text-foreground">
            #BK-{item.id}
          </span>
          <span className="text-muted-foreground/60">&bull;</span>
          <p className="font-bold text-foreground truncate text-sm">
            {item.customer_name}
          </p>
          <span className="text-xs text-muted-foreground">
            &bull; {item.car_name} ({item.plate_number})
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.message ? (
            <span
              className={cn(
                "font-semibold",
                item.badgeTone === "danger"
                  ? "text-rose-400 dark:text-rose-300"
                  : item.badgeTone === "urgent"
                    ? "text-amber-400 dark:text-amber-300"
                    : "text-sky-400 dark:text-sky-300",
              )}
            >
              {item.message}
            </span>
          ) : (
            <span>
              {item.actionType === "release"
                ? `Pickup: ${formatDate(item.start_date)}`
                : `Return: ${formatDate(item.end_date)}`}
            </span>
          )}
          {item.phone_number ? (
            <span className="ml-3 font-medium text-foreground/80">
              ☎ {item.phone_number}
            </span>
          ) : null}
        </p>
      </div>

      <StatusBadge status={item.status} />

      <Link
        href={`/shared/booking_details?id=${item.id}`}
        className="inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
      >
        Details
      </Link>
    </div>
  );

  return (
    <>
      <SectionCard
        title={title}
        icon={ClipboardCheck}
        description={description}
        className={cn("mb-4", className)}
        actions={
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {urgentItems.length > 0 ? (
              <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-rose-400 font-extrabold shadow-xs">
                {urgentItems.length} Urgent
              </span>
            ) : null}
            {tomorrowItems.length > 0 ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2.5 py-0.5 text-sky-300 font-extrabold shadow-xs">
                {tomorrowItems.length} Tomorrow
              </span>
            ) : null}
            {items.length === 0 ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-emerald-400 font-extrabold shadow-xs">
                All Clear
              </span>
            ) : null}
          </div>
        }
        bodyClassName="p-3"
      >
        {items.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear! No actions required for today or tomorrow."
            className={compact ? "py-6" : "py-10"}
          />
        ) : (
          <div className="space-y-3">
            {/* Urgent Items (Today & Overdue) */}
            {urgentItems.length > 0 ? (
              <div className="space-y-2">
                {tomorrowItems.length > 0 ? (
                  <div className="flex items-center justify-between px-1 text-[11px] font-bold text-rose-400">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <TriangleAlert className="size-3.5" />
                      Urgent Actions ({urgentItems.length})
                    </span>
                    {urgentItems.length > 3 ? (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Showing 3 of {urgentItems.length}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {urgentVisible.map((item) => renderItem(item))}
              </div>
            ) : null}

            {/* Tomorrow Items (Upcoming Warnings) */}
            {tomorrowItems.length > 0 ? (
              <div className="space-y-2">
                {urgentItems.length > 0 ? (
                  <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-bold text-sky-400">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <Clock className="size-3.5" />
                      Upcoming for Tomorrow ({tomorrowItems.length})
                    </span>
                    {tomorrowItems.length > 3 ? (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Showing 3 of {tomorrowItems.length}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {tomorrowVisible.map((item) => renderItem(item))}
              </div>
            ) : null}

            {hasMore ? (
              <div className="pt-2 text-center border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setOpenAll(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold text-foreground transition-all hover:border-[#ffcc00] hover:bg-[#ffcc00]/10 hover:text-[#b38a00] active:scale-95 cursor-pointer"
                >
                  View All ({items.length} Actions) &rarr;
                </button>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>

      {/* Complete Scrollable Action Check Modal */}
      <Dialog open={openAll} onOpenChange={setOpenAll}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffd700]">
                <ClipboardCheck className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {title} &mdash; Full Checklist
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Total {items.length} action{items.length === 1 ? "" : "s"} required ({urgentItems.length} urgent today / overdue, {tomorrowItems.length} scheduled tomorrow).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-3 pr-1">
            {urgentItems.length > 0 ? (
              <div className="space-y-2">
                {tomorrowItems.length > 0 ? (
                  <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <TriangleAlert className="size-3.5" />
                    Urgent Actions ({urgentItems.length})
                  </p>
                ) : null}
                {urgentItems.map((item) => renderItem(item))}
              </div>
            ) : null}

            {tomorrowItems.length > 0 ? (
              <div className="space-y-2">
                {urgentItems.length > 0 ? (
                  <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Upcoming for Tomorrow ({tomorrowItems.length})
                  </p>
                ) : null}
                {tomorrowItems.map((item) => renderItem(item))}
              </div>
            ) : null}
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
