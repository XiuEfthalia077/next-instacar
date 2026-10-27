"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Car,
  CircleCheck,
  CircleX,
  Eye,
  Flag,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react";

import { BookingStatusDialog } from "@/components/admin/booking-status-dialog";
import { DeleteBookingDialog } from "@/components/admin/delete-booking-dialog";
import {
  EditReservationDialog,
  type EditableReservation,
} from "@/components/admin/edit-reservation-dialog";
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

const ITEM_CLASS = "gap-2 text-xs font-semibold";

/**
 * Row actions of the online reservation listing.
 *
 * Mirrors the legacy Bootstrap dropdown in `bookings_online.php`:
 *   Pending   -> Edit, Confirm, Cancel
 *   Confirmed -> Release Vehicle, Cancel
 *   Released  -> Complete Trip, Cancel
 *   Completed / Cancelled -> locked
 */
export function OnlineBookingActions({
  booking,
  filter,
  documents,
}: {
  booking: OnlineBooking;
  filter: string;
  documents: BookingDocument[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [target, setTarget] = useState<StatusTarget>("Confirmed");

  const locked = booking.status === "Completed" || booking.status === "Cancelled";

  const ask = (status: StatusTarget) => {
    setTarget(status);
    setStatusOpen(true);
  };

  const detailsHref = `/shared/booking_details?id=${booking.id}`;

  if (locked) {
    return (
      <div className="flex justify-start">
        <Button asChild variant="outline" size="xs" className="gap-1.5 font-semibold">
          <Link href={detailsHref}>
            <Lock className="size-3" />
            Locked
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

        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href={detailsHref}>
              <Eye className="size-4 text-muted-foreground" />
              View Details
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {booking.status === "Pending" ? (
            <>
              <DropdownMenuItem
                className={ITEM_CLASS}
                onSelect={() => setEditOpen(true)}
              >
                <Pencil className="size-4 text-sky-600" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className={ITEM_CLASS}
                onSelect={() => ask("Confirmed")}
              >
                <CircleCheck className="size-4 text-emerald-600" />
                Confirm
              </DropdownMenuItem>
            </>
          ) : null}

          {booking.status === "Confirmed" ? (
            <DropdownMenuItem
              className={ITEM_CLASS}
              onSelect={() => ask("Released")}
            >
              <Car className="size-4 text-sky-600" />
              Release Vehicle
            </DropdownMenuItem>
          ) : null}

          {booking.status === "Released" ? (
            <DropdownMenuItem
              className={ITEM_CLASS}
              onSelect={() => ask("Completed")}
            >
              <Flag className="size-4 text-emerald-600" />
              Complete Trip
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className={ITEM_CLASS}
            onSelect={() => ask("Cancelled")}
          >
            <CircleX className="size-4" />
            Cancel
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className={`${ITEM_CLASS} text-rose-600 focus:text-rose-600 dark:text-rose-400`}
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete Booking
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditReservationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        booking={booking}
        filter={filter}
        documents={documents}
      />

      <DeleteBookingDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bookingId={booking.id}
        redirectTo={`/admin/bookings_online?filter=${encodeURIComponent(filter)}`}
      />

      <BookingStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        bookingId={booking.id}
        status={target}
        filter={filter}
        source="online"
      />
    </div>
  );
}
