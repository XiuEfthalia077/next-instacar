"use client";

import {
  Calendar as CalendarIcon,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  List,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingRow } from "@/lib/data/bookings";
import { formatDate, formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type CalendarViewProps = {
  year: number;
  month: number;
  monthName: string;
  prevYear: number;
  prevMonth: number;
  nextYear: number;
  nextMonth: number;
  todayStr: string;
  daysInMonth: number;
  firstDayWeekday: number;
  bookings: BookingRow[];
  isAdminOrStaff: boolean;
};

export function CalendarView({
  year,
  month,
  monthName,
  prevYear,
  prevMonth,
  nextYear,
  nextMonth,
  todayStr,
  daysInMonth,
  firstDayWeekday,
  bookings,
  isAdminOrStaff,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = React.useState<"month" | "list">("month");
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  // Auto-switch to list on mobile screens and lock to list on mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("list");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter bookings for selected day dialog
  const selectedDayBookings = React.useMemo(() => {
    if (!selectedDate) return [];
    return bookings.filter((b) => {
      if (!b.start_date || !b.end_date) return false;
      return b.start_date <= selectedDate && b.end_date >= selectedDate;
    });
  }, [bookings, selectedDate]);

  // Group bookings strictly by date for the List View
  const groupedBookingsByDate = React.useMemo(() => {
    const map = new Map<string, BookingRow[]>();

    // For every day in the month, check which bookings occur on that date
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const dayBookings = bookings.filter((b) => {
        if (!b.start_date || !b.end_date) return false;
        return b.start_date <= dateStr && b.end_date >= dateStr;
      });

      if (dayBookings.length > 0) {
        map.set(dateStr, dayBookings);
      }
    }

    return Array.from(map.entries()).map(([dateStr, items]) => ({
      dateStr,
      items,
    }));
  }, [bookings, year, month, daysInMonth]);

  return (
    <div className="space-y-4">
      {/* Calendar Controls & View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Link
            href={`/shared/calendar?year=${prevYear}&month=${prevMonth}`}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
            title="Previous Month"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-[140px] rounded-xl border border-border bg-card px-3.5 py-1.5 text-center text-xs font-extrabold text-foreground">
            {monthName} {year}
          </span>
          <Link
            href={`/shared/calendar?year=${nextYear}&month=${nextMonth}`}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
            title="Next Month"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* View Switcher (Desktop toggle, mobile forced to list) */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={cn(
              "hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition md:inline-flex",
              viewMode === "month"
                ? "bg-[#ffcc00] text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-3.5" />
            <span>Month View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
              viewMode === "list"
                ? "bg-[#ffcc00] text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-3.5" />
            <span>List View (Grouped by Date)</span>
            <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
              {bookings.length}
            </span>
          </button>
        </div>
      </div>

      {/* MONTH GRID VIEW (Desktop / Tablet only) */}
      {viewMode === "month" ? (
        <div className="hidden rounded-2xl border border-border bg-card p-4 shadow-sm md:block">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 border-b border-border pb-2.5 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {/* Empty cells before month starts */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[120px] rounded-xl bg-muted/10 p-1 border border-transparent"
              />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;

              // Find bookings that cover this date
              const dayBookings = bookings.filter((b) => {
                if (!b.start_date || !b.end_date) return false;
                return b.start_date <= dateStr && b.end_date >= dateStr;
              });

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    "group relative flex min-h-[120px] cursor-pointer flex-col rounded-xl border p-2 transition hover:border-[#ffcc00] hover:bg-muted/30 hover:shadow-md",
                    isToday
                      ? "border-[#ffcc00] bg-[#ffcc00]/5 ring-1 ring-[#ffcc00]"
                      : "border-border/60 bg-card",
                  )}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between pb-1.5 text-xs">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-extrabold transition",
                        isToday
                          ? "bg-[#ffcc00] text-black shadow-sm"
                          : "text-foreground group-hover:text-[#ffcc00]",
                      )}
                    >
                      {dayNum}
                    </span>
                    {dayBookings.length > 0 ? (
                      <span className="rounded-full bg-muted/80 px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
                        {dayBookings.length} trip{dayBookings.length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>

                  {/* Booking Chips */}
                  <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                    {dayBookings.slice(0, 2).map((b) => {
                      const carName =
                        [b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") ||
                        "Vehicle";

                      const statusDot =
                        b.status === "Confirmed" || b.status === "Released"
                          ? "bg-emerald-500"
                          : b.status === "Pending"
                            ? "bg-amber-400"
                            : b.status === "Completed"
                              ? "bg-sky-400"
                              : "bg-muted-foreground";

                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-foreground transition hover:border-[#ffcc00] hover:bg-[#ffcc00]/10"
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              statusDot,
                            )}
                          />
                          <span className="font-mono text-[9px] text-muted-foreground">
                            #{b.id}
                          </span>
                          <span className="truncate">{carName}</span>
                        </div>
                      );
                    })}

                    {dayBookings.length > 2 ? (
                      <span className="text-[10px] font-bold text-[#ffcc00]">
                        +{dayBookings.length - 2} more trips
                      </span>
                    ) : null}

                    {/* Clear Hover Overlay indicating the cell is clickable */}
                    <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded bg-[#ffcc00]/15 py-0.5 text-[9px] font-extrabold text-[#ffcc00]">
                      <Eye className="size-2.5" />
                      <span>Click to view</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* STRICT DATE-GROUPED LIST VIEW (Mobile Default & Desktop View) */}
      {viewMode === "list" ? (
        <div className="space-y-4">
          {groupedBookingsByDate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-bold text-foreground">
                No Bookings Scheduled
              </p>
              <p className="text-xs text-muted-foreground">
                There are no trips registered in {monthName} {year}.
              </p>
            </div>
          ) : (
            groupedBookingsByDate.map((group) => {
              const isToday = group.dateStr === todayStr;

              return (
                <div
                  key={group.dateStr}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
                >
                  {/* Strict Date Header */}
                  <div
                    className={cn(
                      "flex items-center justify-between border-b px-4 py-2.5",
                      isToday
                        ? "border-[#ffcc00]/40 bg-[#ffcc00]/10"
                        : "border-border/60 bg-muted/30",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon
                        className={cn(
                          "size-4",
                          isToday ? "text-[#ffcc00]" : "text-muted-foreground",
                        )}
                      />
                      <h3 className="text-xs font-extrabold text-foreground">
                        {formatDate(group.dateStr, "long")}
                        {isToday ? (
                          <span className="ml-2 rounded-full bg-[#ffcc00] px-2 py-0.2 text-[10px] font-extrabold text-black">
                            Today
                          </span>
                        ) : null}
                      </h3>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {group.items.length} trip{group.items.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Bookings occurring on this specific date */}
                  <div className="divide-y divide-border/40 p-2">
                    {group.items.map((b) => {
                      const carName =
                        [b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") ||
                        "Vehicle";
                      const customerName = b.users?.name || b.guest_name || "Guest";

                      return (
                        <div
                          key={b.id}
                          className="flex flex-col gap-2.5 p-3 transition hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-[#ffcc00]">
                              <Car className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[11px] font-bold text-foreground">
                                  #BK-{b.id}
                                </span>
                                <p className="font-bold text-foreground text-xs">
                                  {carName}
                                </p>
                                <StatusBadge status={b.status} />
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="size-3" />
                                  {customerName}
                                </span>
                                {isAdminOrStaff && b.cars?.plate_number ? (
                                  <span className="font-mono text-foreground text-[11px]">
                                    Plate: {b.cars.plate_number}
                                  </span>
                                ) : null}
                                <span className="flex items-center gap-1 text-foreground text-[11px]">
                                  <Clock className="size-3 text-[#ffcc00]" />
                                  {formatTime(b.pickup_time)} – {formatTime(b.return_time)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <Link
                              href={`/shared/booking_details?id=${b.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                            >
                              <span>View</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {/* DAY DETAILS DIALOG (Modal for days with bookings - scrollable if > 4) */}
      <Dialog
        open={Boolean(selectedDate)}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto border-border bg-[#0d0f12] text-foreground sm:rounded-2xl p-6">
          <DialogHeader className="border-b border-border/80 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <CalendarIcon className="size-4 text-[#ffcc00]" />
              {selectedDate ? formatDate(selectedDate, "long") : "Day Schedule"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedDayBookings.length} booking
              {selectedDayBookings.length === 1 ? "" : "s"} scheduled for this date.
            </DialogDescription>
          </DialogHeader>

          {selectedDayBookings.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No vehicle trips scheduled for this date.
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-2.5 overflow-y-auto pr-1 pt-2">
              {selectedDayBookings.map((b) => {
                const carName =
                  [b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") ||
                  "Vehicle";
                const customerName = b.users?.name || b.guest_name || "Guest";

                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3.5 transition hover:border-[#ffcc00]/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-xs font-bold text-foreground">
                            #BK-{b.id}
                          </span>
                          <span className="font-bold text-foreground">
                            {carName}
                          </span>
                        </div>
                        {isAdminOrStaff && b.cars?.plate_number ? (
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            Plate: {b.cars.plate_number}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge status={b.status} />
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5 text-foreground" />
                        <span>Customer: {customerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[#ffcc00]" />
                        <span>
                          {formatTime(b.pickup_time)} – {formatTime(b.return_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <span className="text-muted-foreground">
                        {formatDate(b.start_date)} to {formatDate(b.end_date)}
                      </span>
                      <Link
                        href={`/shared/booking_details?id=${b.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#ffcc00] hover:underline"
                      >
                        View Full Details
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
