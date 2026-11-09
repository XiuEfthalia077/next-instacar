"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleX, Eye } from "lucide-react";

import { BookingStatusDialog } from "@/components/admin/booking-status-dialog";
import type { EditableReservation } from "@/components/admin/edit-reservation-dialog";
import type { BookingDocument } from "@/components/admin/document-preview";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OnlineBooking = EditableReservation & { status: string };

type StatusTarget = "Confirmed" | "Released" | "Completed" | "Cancelled";

const ITEM_CLASS = "gap-2 text-xs font-semibold cursor-pointer";

/**
 * Row actions for the online bookings table.
 *
 * Simplified to prevent accidental clicks:
 *   - "View Details" takes admin to the full details page where
 *     heavy actions (Edit, Confirm, Release, Complete, Delete) are performed.
 *   - "Cancel" is kept as a quick action for active bookings.
 */
export function OnlineBookingActions({
  booking,
  filter,
  documents,
  onOptimisticConfirm,
  onError,
}: {
  booking: OnlineBooking;
  filter: string;
  documents: BookingDocument[];
  onOptimisticConfirm?: (id: number, status: StatusTarget) => void;
  onError?: (id: number, error: string) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [target, setTarget] = useState<StatusTarget>("Cancelled");

  const locked = booking.status === "Completed" || booking.status === "Cancelled";

  const ask = (status: StatusTarget) => {
    setTarget(status);
    setStatusOpen(true);
  };

  const detailsHref = `/shared/booking_details?id=${booking.id}`;

  if (locked) {
    return (
      <div className="flex justify-start">
        <Button asChild variant="outline" size="xs" className="gap-1.5 font-bold">
          <Link href={detailsHref}>
            <Eye className="size-3.5 text-muted-foreground" />
            View Details
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="xs" className="gap-1.5 font-bold">
            Actions
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48 rounded-xl">
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href={detailsHref}>
              <Eye className="size-4 text-muted-foreground" />
              View Details
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className={ITEM_CLASS}
            onSelect={() => ask("Cancelled")}
          >
            <CircleX className="size-4" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BookingStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        bookingId={booking.id}
        status={target}
        filter={filter}
        source="online"
        onOptimisticConfirm={(id, status) => onOptimisticConfirm?.(id, status)}
        onError={(id, err) => onError?.(id, err)}
      />
    </div>
  );
}
