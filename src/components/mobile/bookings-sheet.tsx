"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  PenSquare,
  ShoppingCart,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function BookingsSheet({
  open,
  onOpenChange,
  role = "admin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: string;
}) {
  const isOperator = role === "operator";
  const isStaff = role === "staff";

  const calendarHref = "/shared/calendar";
  const onlineBookingsHref =
    isOperator
      ? "/operator/bookings"
      : isStaff
        ? "/staff/bookings"
        : "/admin/bookings_online";

  const manualBookingsHref =
    isStaff ? "/staff/bookings_manual" : "/admin/bookings_manual";

  const hasManualBookings = !isOperator;

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
              <ClipboardList className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold text-foreground">
                Bookings &amp; Reservations
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Manage online orders, manual walk-ins, and schedule calendar
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4 space-y-2.5 flex-1">
          {/* 1. Calendar View */}
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
                <p className="font-extrabold text-sm text-foreground">Calendar View</p>
                <p className="text-xs text-muted-foreground">
                  Interactive monthly calendar &amp; daily release/return schedule
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </Link>

          {/* 2. Online Bookings */}
          <Link
            href={onlineBookingsHref}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 p-3.5 transition hover:border-[#ffcc00]/60 hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-amber-950 dark:text-[#ffcc00]">
                <ShoppingCart className="size-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-foreground">Online Bookings</p>
                <p className="text-xs text-muted-foreground">
                  View and verify customer web and mobile reservations
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </Link>

          {/* 3. Manual Bookings (Admin & Staff) */}
          {hasManualBookings && (
            <Link
              href={manualBookingsHref}
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 p-3.5 transition hover:border-[#ffcc00]/60 hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <PenSquare className="size-5" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-foreground">Manual Bookings</p>
                  <p className="text-xs text-muted-foreground">
                    Create walk-in, phone call, or over-the-counter reservations
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
