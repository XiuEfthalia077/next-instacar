"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

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

/**
 * Action Check UI Card.
 * Placed below the Cancelled stat card, with clear visual cues that it can be clicked.
 * Previews top urgent actions with mobile-optimized card rows that never fragment text,
 * and includes a prominent "View All Actions" trigger opening the full checklist modal.
 */
export function ActionCheckCard({
  items = [],
  title = "Walk-In Action Check",
  description = "Urgent walk-in actions requiring attention today and upcoming warnings for tomorrow.",
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

  // Show up to 2 items in the preview card on mobile/desktop so it doesn't overwhelm the screen
  const previewItems = items.slice(0, 2);
  const remainingCount = Math.max(0, items.length - previewItems.length);

  const renderItemCard = (item: ActionCheckItem) => (
    <div
      key={`${item.id}_${item.actionType}`}
      className={cn(
        "rounded-xl border p-3 sm:p-3.5 transition-all shadow-xs",
        item.urgency === "urgent"
          ? "border-rose-500/40 bg-card/90 hover:border-rose-500/70"
          : "border-border bg-card/90 hover:border-[#ffcc00]/60",
      )}
    >
      {/* Row 1: ID & Status on Left, Details Button on Right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-black text-foreground whitespace-nowrap px-2 py-0.5 rounded-md bg-muted/80 shrink-0">
            #BK-{item.id}
          </span>
          <StatusBadge status={item.status} />
        </div>

        <Link
          href={`/shared/booking_details?id=${item.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:bg-[#ffcc00] hover:text-black min-h-[30px] shrink-0 whitespace-nowrap"
        >
          Details &rarr;
        </Link>
      </div>

      {/* Row 2: Customer Name & Phone */}
      <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-xs text-foreground">
        <span className="font-bold truncate">{item.customer_name}</span>
        {item.phone_number ? (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground ml-2">
            ☎ {item.phone_number}
          </span>
        ) : null}
      </div>

      {/* Row 3: Vehicle Info */}
      <div className="mt-1 text-xs">
        <p className="text-muted-foreground font-medium truncate">
          🚗 {item.car_name} {item.plate_number ? `(${item.plate_number})` : ""}
        </p>
      </div>

      {/* Row 4: Dedicated Urgency Notice Strip */}
      <div
        className={cn(
          "mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
          item.badgeTone === "danger"
            ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
            : item.badgeTone === "urgent"
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border border-sky-500/30 bg-sky-500/10 text-sky-300",
        )}
      >
        {item.badgeTone === "danger" ? (
          <TriangleAlert className="size-3.5 shrink-0 text-rose-400" />
        ) : item.badgeTone === "urgent" ? (
          <AlertCircle className="size-3.5 shrink-0 text-amber-400" />
        ) : (
          <Clock className="size-3.5 shrink-0 text-sky-400" />
        )}
        <span className="font-black uppercase tracking-wide text-[10px] sm:text-[11px] shrink-0">
          {item.badgeLabel}
        </span>
        <span className="opacity-50 shrink-0">&bull;</span>
        <span className="truncate text-[11px]">
          {item.message ||
            (item.actionType === "release"
              ? `Pickup scheduled: ${formatDate(item.start_date)}`
              : `Return scheduled: ${formatDate(item.end_date)}`)}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "mb-4 overflow-hidden rounded-2xl border transition-all duration-300 bg-card p-4 shadow-sm",
        hasUrgent
          ? "border-rose-500/40 bg-gradient-to-br from-card via-card to-rose-950/15 hover:border-rose-500/60"
          : hasTomorrow
            ? "border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-950/15 hover:border-amber-500/60"
            : "border-border hover:border-[#ffcc00]/50",
        className,
      )}
    >
      {/* Action Check Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/60">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs",
              hasUrgent
                ? "bg-rose-500/20 text-rose-400"
                : hasTomorrow
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-emerald-500/20 text-emerald-400",
            )}
          >
            {hasUrgent ? (
              <TriangleAlert className="size-5" />
            ) : hasTomorrow ? (
              <Clock className="size-5" />
            ) : (
              <ClipboardCheck className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight flex items-center gap-2">
              <span>{title}</span>
            </h3>
            <p className="text-xs text-muted-foreground truncate max-w-xl">
              {description}
            </p>
          </div>
        </div>

        {/* Clickable Header Badge (without distracting blinking effect) */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {hasUrgent ? (
            <button
              type="button"
              onClick={() => setOpenAll(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-400 hover:bg-rose-500/30 transition cursor-pointer shadow-xs active:scale-95"
            >
              <span>{urgentItems.length} Urgent</span>
              <ChevronRight className="size-3.5 stroke-[3]" />
            </button>
          ) : hasTomorrow ? (
            <button
              type="button"
              onClick={() => setOpenAll(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-300 hover:bg-amber-500/30 transition cursor-pointer shadow-xs active:scale-95"
            >
              <span>{tomorrowItems.length} Tomorrow</span>
              <ChevronRight className="size-3.5 stroke-[3]" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 shadow-xs">
              <CheckCircle2 className="size-3.5" />
              All Clear
            </span>
          )}
        </div>
      </div>

      {/* Body: Action Item Previews or Empty State */}
      <div className="pt-3 space-y-2.5">
        {items.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All clear! No actions required for today or tomorrow."
            className="py-4 text-xs"
          />
        ) : (
          <>
            <div className="space-y-2">
              {previewItems.map((item) => renderItemCard(item))}
            </div>

            {/* Noticeable Click-to-Review Button */}
            <button
              type="button"
              onClick={() => setOpenAll(true)}
              className="w-full mt-2 flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-[#ffcc00]/15 hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] px-3.5 py-2.5 text-xs font-bold text-foreground transition-all cursor-pointer shadow-xs active:scale-[0.99] group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-[11px] font-black group-hover:bg-[#ffcc00] group-hover:text-black transition-colors">
                  {items.length}
                </span>
                <span className="truncate">
                  View All {items.length} Actions
                  {remainingCount > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (+{remainingCount} more)
                    </span>
                  )}
                </span>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[#b38a00] dark:text-[#ffcc00] font-black text-xs flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Open Checklist</span>
                <span>&rarr;</span>
              </span>
            </button>
          </>
        )}
      </div>

      {/* Full Checklist Modal */}
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
                {urgentItems.map((item) => renderItemCard(item))}
              </div>
            ) : null}

            {tomorrowItems.length > 0 ? (
              <div className="space-y-2">
                <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Upcoming for Tomorrow ({tomorrowItems.length})
                </p>
                {tomorrowItems.map((item) => renderItemCard(item))}
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
    </div>
  );
}
