"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
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

const TONES = {
  danger:
    "border-rose-200 bg-rose-50 text-foreground dark:border-rose-800/50 dark:bg-rose-950/30 hover:shadow-lg hover:shadow-rose-950/30 [&_.stat-icon]:bg-rose-500 [&_.stat-icon]:text-white [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-rose-500/30",
  warning:
    "border-amber-200 bg-amber-50 text-foreground dark:border-amber-800/50 dark:bg-amber-950/30 hover:shadow-lg hover:shadow-amber-950/30 [&_.stat-icon]:bg-amber-500 [&_.stat-icon]:text-black [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-amber-500/30",
  success:
    "border-emerald-200 bg-emerald-50 text-foreground dark:border-emerald-800/50 dark:bg-emerald-950/30 hover:shadow-lg hover:shadow-emerald-950/30 [&_.stat-icon]:bg-emerald-500 [&_.stat-icon]:text-white [&_.stat-icon]:shadow-md [&_.stat-icon]:shadow-emerald-500/30",
};

/**
 * Action Check Stat Card.
 * Replaces the previous cramped multi-line section with a responsive Stat Card
 * that matches the dashboard KPI design system. Tapping the card opens a clean,
 * scrollable Full Checklist modal that renders flawlessly on mobile, tablet, and desktop.
 */
export function ActionCheckCard({
  items = [],
  title = "Action Check",
  description,
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

  const hasUrgent = urgentItems.length > 0;
  const hasTomorrow = tomorrowItems.length > 0;

  const tone: "danger" | "warning" | "success" = hasUrgent
    ? "danger"
    : hasTomorrow
      ? "warning"
      : "success";

  const statValue = hasUrgent
    ? `${urgentItems.length} Urgent`
    : hasTomorrow
      ? `${tomorrowItems.length} Tomorrow`
      : "All Clear";

  const statHint = hasUrgent
    ? `${urgentItems.length} action${urgentItems.length === 1 ? "" : "s"} need attention · Click to view`
    : hasTomorrow
      ? `${tomorrowItems.length} due tomorrow · Click to view`
      : "All bookings on schedule · Click to view";

  const renderChecklistItem = (item: ActionCheckItem) => (
    <div
      key={`${item.id}_${item.actionType}`}
      className={cn(
        "rounded-xl border p-3 sm:p-3.5 transition-colors",
        item.urgency === "urgent"
          ? "border-rose-500/40 bg-card hover:border-rose-500/60"
          : "border-border bg-card hover:border-[#ffcc00]/50",
      )}
    >
      {/* Row 1: Booking ID + Action Badge on left, Status + Details Button on right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-black text-foreground whitespace-nowrap px-1.5 py-0.5 rounded-md bg-muted/70">
            #BK-{item.id}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wide whitespace-nowrap shadow-xs",
              item.badgeTone === "danger"
                ? "border border-rose-500/50 bg-rose-500/20 text-rose-300"
                : item.badgeTone === "urgent"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "border border-sky-500/40 bg-sky-500/15 text-sky-300",
            )}
          >
            {item.badgeTone === "danger" ? (
              <TriangleAlert className="size-3 shrink-0 text-rose-400 animate-pulse" />
            ) : item.badgeTone === "urgent" ? (
              <AlertCircle className="size-3 shrink-0 text-amber-400" />
            ) : (
              <Clock className="size-3 shrink-0 text-sky-400" />
            )}
            <span>{item.badgeLabel}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <StatusBadge status={item.status} />
          <Link
            href={`/shared/booking_details?id=${item.id}`}
            className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:bg-[#ffcc00] hover:text-black min-h-[30px]"
          >
            Details &rarr;
          </Link>
        </div>
      </div>

      {/* Row 2: Customer, Phone, Vehicle and Warning info */}
      <div className="mt-2.5 pt-2 border-t border-border/50 text-xs space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-foreground truncate">
            {item.customer_name}
          </p>
          {item.phone_number ? (
            <span className="shrink-0 text-muted-foreground font-mono text-[11px]">
              ☎ {item.phone_number}
            </span>
          ) : null}
        </div>

        <p className="text-muted-foreground font-medium truncate">
          🚗 {item.car_name} {item.plate_number ? `(${item.plate_number})` : ""}
        </p>

        {item.message ? (
          <p
            className={cn(
              "font-semibold text-[11px] truncate",
              item.badgeTone === "danger"
                ? "text-rose-400 dark:text-rose-300"
                : item.badgeTone === "urgent"
                  ? "text-amber-400 dark:text-amber-300"
                  : "text-sky-400 dark:text-sky-300",
            )}
          >
            ⚠ {item.message}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {item.actionType === "release"
              ? `Pickup: ${formatDate(item.start_date)}`
              : `Return: ${formatDate(item.end_date)}`}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Stat Card Representation */}
      <Card
        onClick={() => setOpenAll(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpenAll(true);
          }
        }}
        aria-label={`${title}: ${statValue}. Click to view checklist.`}
        className={cn(
          "group relative gap-0 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 cursor-pointer select-none active:scale-[0.99]",
          TONES[tone],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover:text-foreground">
              {title}
            </p>
            <p className="mt-2 truncate text-2xl font-black tracking-tight">
              {statValue}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full bg-current opacity-60" />
              {statHint}
            </p>
          </div>

          <span className="stat-icon flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
            {hasUrgent ? (
              <TriangleAlert className="size-5 animate-pulse" />
            ) : hasTomorrow ? (
              <Clock className="size-5" />
            ) : (
              <ClipboardCheck className="size-5" />
            )}
          </span>
        </div>
      </Card>

      {/* 2. Full Checklist Modal */}
      <Dialog open={openAll} onOpenChange={setOpenAll}>
        <DialogContent className="w-[94vw] max-w-[calc(100%-1.5rem)] sm:max-w-2xl max-h-[85vh] p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  hasUrgent
                    ? "bg-rose-500/20 text-rose-400"
                    : hasTomorrow
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400",
                )}
              >
                {hasUrgent ? (
                  <TriangleAlert className="size-5" />
                ) : (
                  <ClipboardCheck className="size-5" />
                )}
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {title} &mdash; Checklist
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {items.length === 0
                    ? "All clear! No actions required for today or tomorrow."
                    : `Total ${items.length} action${items.length === 1 ? "" : "s"} required (${urgentItems.length} urgent today / overdue, ${tomorrowItems.length} scheduled tomorrow).`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-3 pr-1">
            {items.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All clear! No actions required for today or tomorrow."
                className="py-8"
              />
            ) : null}

            {urgentItems.length > 0 ? (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <TriangleAlert className="size-3.5" />
                  Urgent Actions ({urgentItems.length})
                </p>
                {urgentItems.map((item) => renderChecklistItem(item))}
              </div>
            ) : null}

            {tomorrowItems.length > 0 ? (
              <div className="space-y-2">
                <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Upcoming for Tomorrow ({tomorrowItems.length})
                </p>
                {tomorrowItems.map((item) => renderChecklistItem(item))}
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
