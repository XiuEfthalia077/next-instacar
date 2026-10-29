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
  onSelectDay?: (dayStr: string) => void;
  onSelectRange?: (startDay: string, endDay: string) => void;
  title?: string;
  allowPastDates?: boolean;
  pastUnlocked?: boolean;
  onUnlockPast?: () => void;
  className?: string;
};

export function AvailabilityCalendar({
  startDate,
  endDate,
  blockedRanges = [],
  onSelectDay,
  onSelectRange,
  title = "Availability Calendar",
  allowPastDates = true,
  pastUnlocked = false,
  onUnlockPast,
  className,
}: AvailabilityCalendarProps) {
  // Past date confirmation state
  const [pendingPastDay, setPendingPastDay] = React.useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [internalPastUnlocked, setInternalPastUnlocked] = React.useState(false);

  const isPastUnlocked = pastUnlocked || internalPastUnlocked;

  // Track range selection (click 1 = start date, click 2 = end date)
  const [rangeStart, setRangeStart] = React.useState<string | null>(null);
  const [hoverDay, setHoverDay] = React.useState<string | null>(null);

  // Initialize view date based on startDate or current date
  const [calDate, setCalDate] = React.useState(() => {
    if (startDate) {
      const parts = startDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return new Date(parts[0], parts[1] - 1, parts[2] || 1);
      }
    }
    return new Date();
  });

  // Keep month view aligned if startDate changes
  React.useEffect(() => {
    if (startDate) {
      const parts = startDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const targetYear = parts[0];
        const targetMonth = parts[1] - 1;
        setCalDate((prev) => {
          if (
            prev.getFullYear() === targetYear &&
            prev.getMonth() === targetMonth
          ) {
            return prev;
          }
          return new Date(targetYear, targetMonth, 1);
        });
      }
    }
  }, [startDate]);

  // Clear rangeStart if external startDate changes to a different date
  React.useEffect(() => {
    if (rangeStart && startDate && startDate !== rangeStart) {
      setRangeStart(null);
    }
  }, [startDate, rangeStart]);

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
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
  }, []);

  const applyDaySelection = (dayStr: string) => {
    if (onSelectRange) {
      if (rangeStart) {
        // Strict Second Click: Always sets the return/end date and completes the range
        const start = dayStr < rangeStart ? dayStr : rangeStart;
        const end = dayStr < rangeStart ? rangeStart : dayStr;
        onSelectRange(start, end);
        setRangeStart(null);
        setHoverDay(null);
      } else {
        // Strict First Click (or Third Click reset): Sets pickup/start date
        setRangeStart(dayStr);
        onSelectRange(dayStr, dayStr);
      }
    } else if (onSelectDay) {
      onSelectDay(dayStr);
    }
  };

  const handleClickDay = (dayStr: string) => {
    const isPast = dayStr < todayStr;
    if (isPast && !isPastUnlocked) {
      // Step 1: Warning modal on first past date interaction
      setPendingPastDay(dayStr);
      setConfirmModalOpen(true);
    } else {
      // Step 2: Past dates unlocked - freely click start and end date
      applyDaySelection(dayStr);
    }
  };

  const handleConfirmPast = () => {
    setInternalPastUnlocked(true);
    onUnlockPast?.();
    if (pendingPastDay) {
      applyDaySelection(pendingPastDay);
    }
    setPendingPastDay(null);
    setConfirmModalOpen(false);
  };

  const handleCancelPast = () => {
    setPendingPastDay(null);
    setConfirmModalOpen(false);
  };

  return (
    <div
      onMouseLeave={() => setHoverDay(null)}
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
          <span className="rounded-md bg-[#ffcc00] px-2.5 py-0.5 text-black shadow-xs">
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

          // Active range selection
          let isSelected = false;
          if (rangeStart) {
            const previewStart = hoverDay && hoverDay < rangeStart ? hoverDay : rangeStart;
            const previewEnd = hoverDay && hoverDay >= rangeStart ? hoverDay : rangeStart;
            isSelected = currentDayStr >= previewStart && currentDayStr <= previewEnd;
          } else if (startDate && endDate) {
            isSelected = currentDayStr >= startDate && currentDayStr <= endDate;
          } else if (startDate) {
            isSelected = currentDayStr === startDate;
          }

          const isToday = todayStr === currentDayStr;

          return (
            <button
              type="button"
              key={currentDayStr}
              disabled={isUnavailable}
              onClick={() => !isUnavailable && handleClickDay(currentDayStr)}
              onMouseEnter={() => {
                if (rangeStart && !isUnavailable) {
                  setHoverDay(currentDayStr);
                }
              }}
              title={
                blocked
                  ? blocked.reason === "Maintenance"
                    ? "Unavailable — Scheduled for Maintenance"
                    : "Unavailable — Booked"
                  : isPast
                    ? isPastUnlocked
                      ? "Past Date (Unlocked)"
                      : "Past Date (Click to confirm selection)"
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
                      ? isPastUnlocked
                        ? "border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-emerald-500/60 hover:bg-slate-700/70 hover:text-white cursor-pointer"
                        : "border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-500 cursor-pointer"
                      : isToday
                        ? "border-2 border-emerald-400 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer font-black"
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

      {/* Step 1 Past Date Confirmation Modal */}
      <PastDateConfirmDialog
        open={confirmModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleCancelPast();
        }}
        onConfirm={handleConfirmPast}
        title="Past Date Selection"
        message="You are selecting a past date. Are you sure?"
      />
    </div>
  );
}
