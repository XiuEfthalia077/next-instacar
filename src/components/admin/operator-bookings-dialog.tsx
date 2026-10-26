"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";

import { dateOnly, peso } from "@/components/admin/finance-format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { wallClockTimestamp } from "@/lib/datetime";

/**
 * "View Bookings" modal of the operator remittance page
 * (legacy `#bookingsModal` in `operator_revenue.php`).
 */

export type OperatorBookingItem = {
  booking_id: number;
  operator_share: number;
  settled_at: string | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
  booking_type: string | null;
  booking_status: string | null;
};

function bookingHours(booking: OperatorBookingItem): number {
  if (!booking.start_date || !booking.end_date) return 0;

  const start = wallClockTimestamp(
    booking.start_date,
    booking.pickup_time ?? "00:00:00",
  );
  const end = wallClockTimestamp(
    booking.end_date,
    booking.return_time ?? "00:00:00",
  );

  if (!(end > start)) return 0;

  return Math.round(((end - start) / 3_600_000) * 10) / 10;
}

function capitalise(value: string | null) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function OperatorBookingsDialog({
  label,
  bookings,
}: {
  label: string;
  bookings: OperatorBookingItem[];
}) {
  if (!bookings.length) return null;

  const total = bookings.reduce((sum, booking) => sum + booking.operator_share, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.65rem] border border-slate-300 bg-transparent px-4 py-2 text-[0.8rem] font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-[#3f3f46] dark:text-[#e2e8f0] dark:hover:bg-[#27272a] dark:hover:text-white"
        >
          <ClipboardList className="size-4" />
          View Bookings ({bookings.length})
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">Contributing Bookings</DialogTitle>
          <DialogDescription className="truncate">{label}</DialogDescription>
        </DialogHeader>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
          Bookings contributing to this total
        </p>

        <div className="space-y-2.5">
          {bookings.map((booking) => {
            const hours = bookingHours(booking);

            return (
              <div
                key={`${booking.booking_id}-${booking.settled_at ?? "pending"}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-bold">
                    <Link
                      href={`/shared/booking_details?id=${booking.booking_id}`}
                      className="text-[#b38a00] hover:underline dark:text-[#ffd700]"
                    >
                      #BK-{booking.booking_id}
                    </Link>
                    <span className="px-1.5 font-normal text-muted-foreground">·</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {capitalise(booking.booking_type)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dateOnly(booking.start_date)} · {hours} hr
                    {hours === 1 ? "" : "s"} · Settled{" "}
                    {dateOnly(booking.settled_at)}
                  </p>
                </div>

                <p className="shrink-0 font-bold tabular-nums">
                  {peso(booking.operator_share)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-border pt-3">
          <p className="font-bold">Total from bookings</p>
          <p className="font-bold tabular-nums">{peso(total)}</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-lg font-semibold">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
