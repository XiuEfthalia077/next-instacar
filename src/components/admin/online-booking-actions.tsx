"use client";

import Link from "next/link";
import { ChevronDown, Eye } from "lucide-react";

import type { EditableReservation } from "@/components/admin/edit-reservation-dialog";
import type { BookingDocument } from "@/components/admin/document-preview";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OnlineBooking = EditableReservation & { status: string };

type StatusTarget = "Confirmed" | "Released" | "Completed" | "Cancelled";

const ITEM_CLASS = "gap-2 text-xs font-semibold cursor-pointer";

/**
 * Row actions for the online bookings table.
 *
 * Simplified per Task 4.2:
 *   - The "Actions" dropdown ONLY contains "View Details".
 *   - Heavy actions (Edit, Confirm, Release, Complete, Delete) are performed
 *     on the Booking Details page.
 */
export function OnlineBookingActions({
  booking,
}: {
  booking: OnlineBooking;
  filter?: string;
  documents?: BookingDocument[];
  onOptimisticConfirm?: (id: number, status: StatusTarget) => void;
  onError?: (id: number, error: string) => void;
}) {
  const detailsHref = `/shared/booking_details?id=${booking.id}`;

  return (
    <div className="flex justify-start">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="xs" className="gap-1 font-bold">
            <span>Actions</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40 rounded-xl">
          <DropdownMenuItem asChild className={ITEM_CLASS}>
            <Link href={detailsHref}>
              <Eye className="size-4 text-muted-foreground" />
              View Details
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
