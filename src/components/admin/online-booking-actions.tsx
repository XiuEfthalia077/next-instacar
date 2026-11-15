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
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={detailsHref}
        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-card px-2.5 py-1 text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] hover:bg-muted/40 transition shadow-xs"
        title="View Booking Details"
      >
        <Eye className="size-3.5 text-muted-foreground" />
        <span>View</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="xs"
            className="size-7 p-0 rounded-xl border-neutral-200 dark:border-neutral-800 hover:border-[#ffcc00]"
          >
            <ChevronDown className="size-3.5 text-muted-foreground" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-40 rounded-xl z-[200] border-neutral-200 dark:border-neutral-800 bg-popover shadow-xl"
        >
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
