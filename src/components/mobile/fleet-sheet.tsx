"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  Car,
  ChevronRight,
  Wrench,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function FleetSheet({
  open,
  onOpenChange,
  role = "admin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: string;
}) {
  const isOperator = role === "operator";

  const fleetHref = "/shared/cars";
  const scheduleHref = "/shared/my_car_schedules";
  const calendarHref = "/shared/calendar";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-lg sm:mx-auto flex flex-col overflow-y-auto"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />

        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00] text-black font-black shadow-sm">
              <Car className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold text-foreground">
                Fleet &amp; Schedules
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Manage vehicle inventory, maintenance blackouts, and calendars
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4 space-y-2 flex-1">
          <Link
            href={fleetHref}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 p-3.5 transition hover:border-[#ffcc00]/60 hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-amber-950 dark:text-[#ffcc00]">
                <Car className="size-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-foreground">Fleet Management</p>
                <p className="text-xs text-muted-foreground">
                  {isOperator ? "My vehicle inventory & statuses" : "Full fleet inventory, rates & statuses"}
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </Link>

          <Link
            href={scheduleHref}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 p-3.5 transition hover:border-[#ffcc00]/60 hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
                <CalendarRange className="size-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-foreground">Schedules &amp; Blackouts</p>
                <p className="text-xs text-muted-foreground">
                  Vehicle maintenance blocks &amp; blackout dates
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </Link>

          <Link
            href={calendarHref}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 p-3.5 transition hover:border-[#ffcc00]/60 hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-400">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-foreground">Master Booking Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Date-grouped list &amp; calendar view of all bookings
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
