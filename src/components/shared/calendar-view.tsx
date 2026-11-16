"use client";

import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  List,
  Search,
  Sparkles,
  User,
  X,
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
import { getBookingUrgency } from "@/lib/urgency";
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

  // List View / Mobile Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("");

  // Filter bookings based on List View search, status, and date filter
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (dateFilter) {
        if (!b.start_date || !b.end_date) return false;
        if (b.start_date > dateFilter || b.end_date < dateFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const carName = `${b.cars?.brand || ""} ${b.cars?.model || ""}`.toLowerCase();
        const customer = (b.users?.name || b.guest_name || "").toLowerCase();
        const idMatch = String(Math.abs(b.id)).includes(q);
        const plateMatch = (b.cars?.plate_number || "").toLowerCase().includes(q);
        if (!carName.includes(q) && !customer.includes(q) && !idMatch && !plateMatch) {
          return false;
        }
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery, dateFilter]);

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

    // For every day in the month, check which filtered bookings occur on that date
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      if (dateFilter && dateStr !== dateFilter) continue;
      const dayBookings = filteredBookings.filter((b) => {
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
  }, [filteredBookings, year, month, daysInMonth, dateFilter]);

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

        {/* View Switcher: Responsive Segmented Control [ List View | Calendar View ] */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer",
              viewMode === "list"
                ? "bg-[#ffcc00] text-black shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-3.5" />
            <span>List View</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                viewMode === "list"
                  ? "bg-black/15 font-black text-black"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {bookings.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer",
              viewMode === "month"
                ? "bg-[#ffcc00] text-black shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-3.5" />
            <span>Calendar View</span>
          </button>
        </div>
      </div>

      {/* MONTH GRID VIEW (Desktop / Tablet & Condensed Mobile) */}
      {viewMode === "month" ? (
        <>
          {/* DESKTOP / TABLET MONTH VIEW (>= md) */}
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

                const hasMaintenance = dayBookings.some((b) => b.status === "Maintenance");

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "group relative flex min-h-[120px] cursor-pointer flex-col rounded-xl border p-2 transition hover:border-[#ffcc00] hover:bg-muted/30 hover:shadow-md",
                      hasMaintenance
                        ? "border-rose-500/80 bg-rose-500/10 ring-1 ring-rose-500/40"
                        : isToday
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
                            : hasMaintenance
                              ? "bg-rose-500 text-white"
                              : "text-foreground group-hover:text-[#ffcc00]",
                        )}
                      >
                        {dayNum}
                      </span>
                      <div className="flex items-center gap-1">
                        {hasMaintenance ? (
                          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-black text-rose-400 border border-rose-500/30">
                            🔧 Maint
                          </span>
                        ) : null}
                        {dayBookings.length > 0 ? (
                          <span className="rounded-full bg-muted/80 px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
                            {dayBookings.length} trip{dayBookings.length > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Booking Chips */}
                    <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                      {dayBookings.slice(0, 2).map((b) => {
                        const carName =
                          [b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") ||
                          "Vehicle";

                        const isMaintenance = b.status === "Maintenance";
                        const statusDot = isMaintenance
                          ? "bg-rose-500"
                          : b.status === "Confirmed" || b.status === "Released"
                            ? "bg-emerald-500"
                            : b.status === "Pending"
                              ? "bg-amber-400"
                              : b.status === "Completed"
                                ? "bg-sky-400"
                                : "bg-muted-foreground";

                        return (
                          <div
                            key={b.id}
                            className={cn(
                              "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition",
                              isMaintenance
                                ? "border-rose-500/40 bg-rose-500/20 text-rose-300 hover:border-rose-400"
                                : "border-border/40 bg-muted/40 text-foreground hover:border-[#ffcc00] hover:bg-[#ffcc00]/10",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                statusDot,
                              )}
                            />
                            <span className="font-mono text-[9px] text-muted-foreground">
                              {b.id < 0 ? "MAINT" : `#${b.id}`}
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

          {/* CONDENSED MOBILE MONTH VIEW (< md) */}
          <div className="block rounded-2xl border border-border bg-card p-3.5 shadow-sm md:hidden space-y-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase text-muted-foreground border-b border-border/70 pb-2">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayWeekday }).map((_, i) => (
                <div key={`m-empty-${i}`} className="aspect-square rounded-xl bg-muted/10 border border-transparent" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;

                const dayBookings = bookings.filter((b) => {
                  if (!b.start_date || !b.end_date) return false;
                  return b.start_date <= dateStr && b.end_date >= dateStr;
                });

                const urgentAlert = dayBookings.map((b) => getBookingUrgency(b)).find((u) => u !== null);
                const hasMaintenance = dayBookings.some((b) => b.status === "Maintenance");
                const hasRelease = dayBookings.some((b) => b.start_date === dateStr);
                const hasReturn = dayBookings.some((b) => b.end_date === dateStr);
                const hasActive = dayBookings.some(
                  (b) => b.status === "Confirmed" || b.status === "Released",
                );
                const hasPending = dayBookings.some((b) => b.status === "Pending");

                return (
                  <button
                    key={`m-day-${dayNum}`}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "aspect-square flex flex-col items-center justify-between p-1 rounded-xl border transition active:scale-95 cursor-pointer relative",
                      urgentAlert
                        ? "border-rose-500/80 bg-rose-500/10 ring-1 ring-rose-500/40"
                        : hasMaintenance
                          ? "border-rose-500/80 bg-rose-500/10 ring-1 ring-rose-500/40"
                          : isToday
                            ? "border-[#ffcc00] bg-[#ffcc00]/10 ring-1 ring-[#ffcc00]"
                            : dayBookings.length > 0
                              ? "border-border/80 bg-muted/40 hover:border-[#ffcc00]"
                              : "border-border/40 bg-card hover:bg-muted/30",
                    )}
                  >
                    {/* Top right urgent pulse dot */}
                    {urgentAlert && (
                      <span
                        className="absolute right-1 top-1 size-1.5 rounded-full bg-rose-500 animate-ping ring-2 ring-rose-500"
                        title={urgentAlert.message}
                      />
                    )}

                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full text-[11px] font-black",
                        isToday
                          ? "bg-[#ffcc00] text-black shadow-xs"
                          : urgentAlert
                            ? "bg-rose-500 text-white"
                            : hasMaintenance
                              ? "bg-rose-500 text-white"
                              : "text-foreground",
                      )}
                    >
                      {dayNum}
                    </span>

                    {/* Booking Indicator Dots (Urgent: Pulsing Rose, Release: Green, Return: Rose/Red, Maint: Purple/Rose) */}
                    <div className="flex items-center justify-center gap-1 min-h-[6px] w-full">
                      {urgentAlert && (
                        <span className="size-1.5 rounded-full bg-rose-500 animate-pulse ring-1 ring-rose-500" title={urgentAlert.message} />
                      )}
                      {hasRelease && (
                        <span className="size-1.5 rounded-full bg-emerald-500 ring-1 ring-emerald-500/30" title="Trip Release / Pickup" />
                      )}
                      {hasReturn && (
                        <span className="size-1.5 rounded-full bg-rose-500 ring-1 ring-rose-500/30" title="Trip Return / Dropoff" />
                      )}
                      {hasMaintenance && (
                        <span className="size-1.5 rounded-full bg-purple-500" title="Vehicle Maintenance" />
                      )}
                      {!hasRelease && !hasReturn && !hasMaintenance && !urgentAlert && dayBookings.length > 0 && (
                        <span className="size-1.5 rounded-full bg-[#ffcc00]" title="Ongoing Rental" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mobile Legend & Help Note */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
              <span className="font-semibold text-foreground">💡 Tap a date to inspect trips</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Urgent (≤48h)
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Release
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400">
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  Return
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-purple-700 dark:text-purple-400">
                  <span className="size-1.5 rounded-full bg-purple-500" />
                  Maint
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* STRICT DATE-GROUPED LIST VIEW (Mobile Default & Desktop View) */}
      {viewMode === "list" ? (
        <div className="space-y-4">
          {/* Quick List / Mobile Filter Bar */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter bookings by guest, car, plate, ID..."
                className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-8 text-xs text-foreground outline-none transition focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter specifically for List View */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs">
                <CalendarIcon className="size-3.5 text-[#ffcc00]" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-foreground outline-none"
                  title="Filter by Specific Date"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className="text-muted-foreground hover:text-foreground"
                    title="Clear date filter"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-muted/40 px-3 text-xs font-semibold text-foreground outline-none transition focus:border-[#ffcc00]"
              >
                <option value="all">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Released">Released (Active)</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Maintenance">Maintenance</option>
              </select>

              {(searchQuery || statusFilter !== "all" || dateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setDateFilter("");
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/20 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

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
                      const urgency = getBookingUrgency(b);

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
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <User className="size-3 text-muted-foreground" />
                                  {customerName}
                                </span>
                                {isAdminOrStaff && b.cars?.plate_number ? (
                                  <span className="font-mono text-foreground text-[11px]">
                                    Plate: {b.cars.plate_number}
                                  </span>
                                ) : null}
                              </div>

                              {/* Color Coded Schedule Dates: Green for Release, Rose/Red for Return */}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                  Release: {formatDate(b.start_date)} ({formatTime(b.pickup_time)})
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                  <span className="size-1.5 rounded-full bg-rose-500" />
                                  Return: {formatDate(b.end_date)} ({formatTime(b.return_time)})
                                </span>

                                {/* Urgency Warning: Prominent warning when release/return is within 48h or overdue */}
                                {urgency && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-black shadow-xs",
                                      urgency.badgeClass,
                                    )}
                                  >
                                    <AlertCircle className="size-3 shrink-0" />
                                    <span>{urgency.message}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            {b.status === "Maintenance" ? (
                              <Link
                                href={`/shared/my_car_schedules?car_id=${b.car_id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                              >
                                <span>Maintenance</span>
                                <ExternalLink className="size-3" />
                              </Link>
                            ) : (
                              <Link
                                href={`/shared/booking_details?id=${b.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                              >
                                <span>View</span>
                                <ExternalLink className="size-3" />
                              </Link>
                            )}
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
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto border-border bg-card text-card-foreground sm:rounded-2xl p-6 sm:p-8">
          <DialogHeader className="border-b border-border/80 pb-4 pr-8">
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
                const urgency = getBookingUrgency(b);

                return (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-card p-3.5 transition hover:border-[#ffcc00]/60 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-black text-foreground border border-neutral-300 dark:border-neutral-700">
                            #BK-{b.id}
                          </span>
                          <span className="font-black text-foreground">
                            {carName}
                          </span>
                        </div>
                        {isAdminOrStaff && b.cars?.plate_number ? (
                          <p className="mt-0.5 font-mono text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            Plate: {b.cars.plate_number}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge status={b.status} />
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 border-t border-neutral-200 dark:border-neutral-700 pt-2 text-xs text-neutral-600 dark:text-neutral-400 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5 text-foreground shrink-0" />
                        <span className="font-semibold text-foreground">Customer: {customerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[#ffcc00] shrink-0" />
                        <span className="font-medium text-foreground">
                          {formatTime(b.pickup_time)} – {formatTime(b.return_time)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Release: {formatDate(b.start_date)} • {formatTime(b.pickup_time)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          Return: {formatDate(b.end_date)} • {formatTime(b.return_time)}
                        </span>
                        {urgency && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-black shadow-xs",
                              urgency.badgeClass,
                            )}
                          >
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>{urgency.message}</span>
                          </span>
                        )}
                      </div>
                      {b.status === "Maintenance" ? (
                        <Link
                          href={`/shared/my_car_schedules?car_id=${b.car_id}`}
                          className="inline-flex items-center gap-1 font-bold text-rose-500 dark:text-rose-400 hover:underline"
                        >
                          Manage Schedule
                          <ExternalLink className="size-3" />
                        </Link>
                      ) : (
                        <Link
                          href={`/shared/booking_details?id=${b.id}`}
                          className="inline-flex items-center gap-1 font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline"
                        >
                          View Full Details
                          <ExternalLink className="size-3" />
                        </Link>
                      )}
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
