"use client";

import { useState } from "react";

import { BookingStatusDialog } from "@/components/admin/booking-status-dialog";
import { Button } from "@/components/ui/button";

type StatusAction = "Confirmed" | "Released" | "Completed" | "Cancelled";

/**
 * Allowed next steps of the legacy status machine:
 *   Pending -> Confirmed | Cancelled
 *   Confirmed -> Released | Cancelled
 *   Released -> Completed | Cancelled
 */
const NEXT_STATUS: Record<string, StatusAction[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Released", "Cancelled"],
  Released: ["Completed", "Cancelled"],
};

const LABELS: Record<StatusAction, string> = {
  Confirmed: "Confirm",
  Released: "Release",
  Completed: "Complete",
  Cancelled: "Cancel",
};

/**
 * Status transition buttons for the operator's online reservations.
 *
 * The legacy listing linked to `process/booking_actions.php`; the same values
 * are posted through the shared `BookingStatusDialog` server action.
 */
export function OperatorBookingActions({
  bookingId,
  status,
  filter,
}: {
  bookingId: number;
  status: string;
  filter: string;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<StatusAction | null>(null);

  const next = NEXT_STATUS[status] ?? [];

  if (next.length === 0) {
    return <span className="text-xs text-muted-foreground">&mdash;</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {next.map((value) => (
        <Button
          key={value}
          type="button"
          size="xs"
          variant={value === "Cancelled" ? "outline" : "default"}
          className={
            value === "Cancelled"
              ? "rounded-full border-rose-200 px-2.5 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
              : "rounded-full px-2.5 font-bold"
          }
          onClick={() => {
            setAction(value);
            setOpen(true);
          }}
        >
          {LABELS[value]}
        </Button>
      ))}

      {action ? (
        <BookingStatusDialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setAction(null);
          }}
          bookingId={bookingId}
          status={action}
          filter={filter}
          source="online"
        />
      ) : null}
    </div>
  );
}
