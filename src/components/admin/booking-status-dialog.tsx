"use client";

import { CircleCheck, CircleX, Flag, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateBookingStatusAction } from "@/lib/actions/bookings";

type StatusAction = "Confirmed" | "Released" | "Completed" | "Cancelled";

const COPY: Record<
  StatusAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
  }
> = {
  Confirmed: {
    title: "Confirm Booking?",
    description: "Are you sure you want to confirm this reservation?",
    confirmLabel: "Yes, Confirm",
    icon: CircleCheck,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  Released: {
    title: "Release Vehicle?",
    description: "Are you sure the vehicle is being released to the customer?",
    confirmLabel: "Yes, Release",
    icon: CircleCheck,
    iconClass: "text-sky-600 dark:text-sky-400",
  },
  Completed: {
    title: "Complete Trip?",
    description: "Are you sure this booking is finished and ready for settlement?",
    confirmLabel: "Yes, Complete",
    icon: Flag,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  Cancelled: {
    title: "Cancel Booking?",
    description: "This action cannot be undone. The vehicle will be freed up.",
    confirmLabel: "Yes, Cancel It",
    icon: TriangleAlert,
    iconClass: "text-rose-600 dark:text-rose-400",
  },
};

/**
 * Confirmation dialog for the booking status machine.
 *
 * The legacy listing used SweetAlert before following
 * `process/booking_actions.php?id=...&status=...`; the form below posts the
 * same values to `updateBookingStatusAction()`.
 */
export function BookingStatusDialog({
  open,
  onOpenChange,
  bookingId,
  status,
  filter,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: number;
  status: StatusAction;
  filter: string;
  source: "online" | "manual";
}) {
  const copy = COPY[status];
  const Icon = copy.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-md">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Icon className={`size-5 ${copy.iconClass}`} />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {status === "Cancelled" ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <CircleX className="mt-0.5 size-4 shrink-0" />
            The legacy cancellation fee (₱500.00) will be applied.
          </div>
        ) : null}

        <form action={updateBookingStatusAction}>
          <input type="hidden" name="id" value={bookingId} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="filter" value={filter} />

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-4 font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant={status === "Cancelled" ? "destructive" : "default"}
              className="rounded-lg px-4 font-bold"
            >
              {copy.confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
