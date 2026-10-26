"use client";

import { useState } from "react";
import { CalendarClock, CircleCheck, CircleX, Flag } from "lucide-react";

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
import { EditReservationDialog, type EditableReservation } from "@/components/shared/edit-reservation-dialog";
import type { BookingDocument } from "@/components/admin/document-preview";

type StatusAction = "Confirmed" | "Released" | "Completed" | "Cancelled";

const COPY: Record<
  StatusAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    className: string;
  }
> = {
  Confirmed: {
    title: "Confirm Booking?",
    description: "Are you sure you want to confirm this reservation?",
    confirmLabel: "Yes, Confirm",
    icon: CircleCheck,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  Released: {
    title: "Release Vehicle?",
    description: "Are you sure the vehicle is being released to the customer?",
    confirmLabel: "Yes, Release",
    icon: CircleCheck,
    iconClass: "text-sky-600 dark:text-sky-400",
    className: "bg-sky-600 text-white hover:bg-sky-700",
  },
  Completed: {
    title: "Complete Trip?",
    description: "Are you sure this booking is finished and ready for settlement?",
    confirmLabel: "Yes, Complete",
    icon: Flag,
    iconClass: "text-indigo-600 dark:text-indigo-400",
    className: "bg-indigo-600 text-white hover:bg-indigo-700",
  },
  Cancelled: {
    title: "Cancel Booking?",
    description: "This action cannot be undone. The vehicle will be freed up.",
    confirmLabel: "Yes, Cancel It",
    icon: CircleX,
    iconClass: "text-rose-600 dark:text-rose-400",
    className: "bg-rose-600 text-white hover:bg-rose-700",
  },
};

/**
 * Status machine buttons for the shared booking details page.
 *
 * The legacy page rendered a select + save button; the same transitions are
 * kept here but exposed as the explicit Confirm / Release / Complete / Cancel
 * actions used across the rest of the new app.
 */
export function BookingActions({
  booking,
  documents,
  filter = "All",
  canEdit,
}: {
  booking: EditableReservation & { status: string; booking_type: string | null };
  documents: BookingDocument[];
  filter?: string;
  canEdit: boolean;
}) {
  const [action, setAction] = useState<StatusAction | null>(null);

  const source = booking.booking_type === "manual" ? "manual" : "online";

  const actions: StatusAction[] = [];
  if (booking.status === "Pending") actions.push("Confirmed");
  if (booking.status === "Confirmed") actions.push("Released");
  if (booking.status === "Released") actions.push("Completed");
  if (booking.status !== "Cancelled" && booking.status !== "Completed") {
    actions.push("Cancelled");
  }

  const copy = action ? COPY[action] : null;
  const Icon = copy?.icon;

  return (
    <div className="space-y-2">
      {actions.map((status) => {
        const item = COPY[status];
        const ItemIcon = item.icon;
        return (
          <Button
            key={status}
            type="button"
            className={`w-full gap-2 font-bold ${item.className}`}
            onClick={() => setAction(status)}
          >
            <ItemIcon className="size-4" />
            {status === "Confirmed"
              ? "Confirm Booking"
              : status === "Released"
                ? "Release Vehicle"
                : status === "Completed"
                  ? "Complete Trip"
                  : "Cancel Booking"}
          </Button>
        );
      })}

      {canEdit ? (
        <EditReservationDialog
          booking={booking}
          filter={filter}
          documents={documents}
          trigger={
            <Button type="button" variant="outline" className="w-full gap-2 font-semibold">
              <CalendarClock className="size-4" />
              Edit Reservation
            </Button>
          }
        />
      ) : null}

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-md">
          <DialogHeader className="border-b border-border/70 pb-3 pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {Icon ? <Icon className={`size-5 ${copy?.iconClass}`} /> : null}
              {copy?.title}
            </DialogTitle>
            <DialogDescription>{copy?.description}</DialogDescription>
          </DialogHeader>

          {action === "Cancelled" ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <CircleX className="mt-0.5 size-4 shrink-0" />
              The legacy cancellation fee (₱500.00) will be applied.
            </div>
          ) : null}

          <form action={updateBookingStatusAction}>
            <input type="hidden" name="id" value={booking.id} />
            <input type="hidden" name="status" value={action ?? ""} />
            <input type="hidden" name="source" value={source} />
            <input type="hidden" name="filter" value={filter} />
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant={action === "Cancelled" ? "destructive" : "default"}
                className="rounded-lg px-4 font-bold"
              >
                {copy?.confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
