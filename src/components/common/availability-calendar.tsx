"use client";

import * as React from "react";
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { PastDateConfirmDialog } from "@/components/common/past-date-confirm-dialog";
import { cn } from "@/lib/utils";

export type BlockedRange = {
  start: string;
  end: string;
  reason?: string;
};

export type AvailabilityCalendarProps = {
  startDate?: string;
  endDate?: string;
  blockedRanges?: BlockedRange[];
  onSelectDay: (dayStr: string) => void;
  title?: string;
  allowPastDates?: boolean;
  className?: string;
};

export function AvailabilityCalendar({
  startDate,
  endDate,
  blockedRanges = [],
  onSelectDay,
  title = "Availability Calendar",
  allowPastDates = true,
  className,
}: AvailabilityCalendarProps) {
  // Past date confirmation state
  const [pendingPastDay, setPendingPastDay] = React.useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);

  // Initialize view date based on startDate or current date
  const [calDate, setCalDate] = React.useState(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Keep month view aligned if startDate changes significantly
  React.useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setCalDate((prev) => {
          if (
            prev.getFullYear() === d.getFullYear() &&
            prev.getMonth() === d.getMonth()
          ) {
            return prev;
          }
          return new Date(d.getFullYear(), d.getMonth(), 1);
        });
      }
    }
  }, [startDate]);

  const calendarDays = React.useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [calDate]);

  const monthYearLabel = calDate.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  const nextMonth = () => {
    setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const todayStr = React.useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const handleClickDay = (dayStr: string) => {
    if (dayStr < todayStr) {
      // Past date clicked: immediately prompt for confirmation
      setPendingPastDay(dayStr);
      setConfirmModalOpen(true);
    } else {
      // Normal available / today date
      onSelectDay(dayStr);
    }
  };

  const handleConfirmPast = () => {
    if (pendingPastDay) {
      onSelectDay(pendingPastDay);
    }
    setPendingPastDay(null);
    setConfirmModalOpen(false);
  };

  const handleCancelPast = () => {
    // If user clicks "No" or closes the modal, selection reverts
    setPendingPastDay(null);
    setConfirmModalOpen(false);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs",
        className,
      )}
    >
      {/* Header and Legend matching Screenshot 1 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <CalendarIcon className="size-4 text-[#ffcc00]" />
          <span>{title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 text-white shadow-xs">
            Available
          </span>
          <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-slate-300 shadow-xs">
            Past
          </span>
          <span className="rounded-md bg-rose-600 px-2.5 py-0.5 text-white shadow-xs">
            Booked / Maint
          </span>
          <span className="rounded-md bg-[#ffcc00] px-2.5 py-0.5 font-extrabold text-black shadow-xs">
            Selected
          </span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between border-y border-border/60 py-2 text-xs">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border border-border bg-muted/40 px-3 py-1 font-bold text-foreground hover:bg-[#ffcc00] hover:text-black transition active:scale-95"
        >
          &lt; Prev
        </button>
        <span className="font-black text-sm tracking-wide text-foreground">
          {monthYearLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg border border-border bg-muted/40 px-3 py-1 font-bold text-foreground hover:bg-[#ffcc00] hover:text-black transition active:scale-95"
        >
          Next &gt;
        </button>
      </div>

      {/* Day Names Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-muted-foreground">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {calendarDays.map((d, index) => {
          if (d === null) {
            return <div key={`empty-${index}`} className="h-8" />;
          }

          const pad = (n: number) => String(n).padStart(2, "0");
          const currentDayStr = `${calDate.getFullYear()}-${pad(calDate.getMonth() + 1)}-${pad(d)}`;
          const blocked = blockedRanges.find(
            (r) => r.start <= currentDayStr && r.end >= currentDayStr,
          );
          const isPast = currentDayStr < todayStr;
          const isBlocked = Boolean(blocked);
          const isUnavailable = isBlocked || (!allowPastDates && isPast);
          const isSelected =
            startDate &&
            endDate &&
            currentDayStr >= startDate &&
            currentDayStr <= endDate;
          const isToday = todayStr === currentDayStr;

          return (
            <button
              type="button"
              key={currentDayStr}
              disabled={isUnavailable}
              onClick={() => !isUnavailable && handleClickDay(currentDayStr)}
              title={
                blocked
                  ? blocked.reason === "Maintenance"
                    ? "Unavailable — Scheduled for Maintenance"
                    : "Unavailable — Booked"
                  : isPast
                    ? "Past Date (Click to confirm selection)"
                    : isToday
                      ? "Today — Available"
                      : "Available for Rent"
              }
              className={cn(
                "flex h-8 items-center justify-center rounded-lg font-bold transition text-xs",
                isSelected
                  ? "border-2 border-[#ffcc00] bg-[#ffcc00]/25 text-[#ffcc00] font-black shadow-sm"
                  : isBlocked
                    ? "border border-rose-500/50 bg-rose-500/20 text-rose-400 cursor-not-allowed opacity-90"
                    : isPast
                      ? "border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-500 cursor-pointer"
                      : isToday
                        ? "border border-[#ffcc00]/80 bg-[#ffcc00]/15 text-foreground hover:bg-[#ffcc00]/25 cursor-pointer font-black"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500 cursor-pointer",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <AlertCircle className="size-3 text-muted-foreground" />
          Red dates booked/maint &bull; Grey dates in the past
        </span>
        <span className="text-emerald-400 font-semibold">
          Green dates available
        </span>
      </div>

      {/* Immediate Past Date Confirmation Modal */}
      <PastDateConfirmDialog
        open={confirmModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleCancelPast();
        }}
        onConfirm={handleConfirmPast}
        title="Past Date Selection"
        message="You are selecting a date in the past. Are you sure you want to proceed with this booking?"
      />
    </div>
  );
}
