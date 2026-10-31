"use client";

import {
  CalendarDays,
  Car,
  Clock,
  ExternalLink,
  MapPin,
  Star,
  Truck,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { TrackStageDialog } from "@/components/customer/track-stage-dialog";
import { CustomerReviewDialog } from "@/components/customer/customer-review-dialog";
import type { BookingRow } from "@/lib/data/bookings";
import { formatDate, formatTime } from "@/lib/datetime";

type CustomerBookingsTableProps = {
  bookings: BookingRow[];
};

export function CustomerBookingsTable({
  bookings,
}: CustomerBookingsTableProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<BookingRow | null>(
    null,
  );
  const [modalOpen, setModalOpen] = React.useState(false);
  const [reviewBooking, setReviewBooking] = React.useState<BookingRow | null>(
    null,
  );

  const handleTrackStage = (b: BookingRow) => {
    setSelectedBooking(b);
    setModalOpen(true);
  };

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No Bookings Found"
        description="No bookings matched your filter criteria. Try adjusting your search."
        action={
          <Link
            href="/user/cars"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2 text-sm font-bold text-black"
          >
            Browse Fleet
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3.5 py-3 text-left font-extrabold">Booking Info</th>
              <th className="px-3.5 py-3 text-left font-extrabold">Vehicle Details</th>
              <th className="px-3.5 py-3 text-left font-extrabold">Rental Window</th>
              <th className="px-3.5 py-3 text-left font-extrabold">Financial Details</th>
              <th className="px-3.5 py-3 text-center font-extrabold">Fulfillment</th>
              <th className="px-3.5 py-3 text-center font-extrabold">Status</th>
              <th className="px-3.5 py-3 text-right font-extrabold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {bookings.map((booking) => {
              const carName =
                [booking.cars?.brand, booking.cars?.model]
                  .filter(Boolean)
                  .join(" ") || "Vehicle";
              const isDelivery =
                booking.fulfillment_type?.toLowerCase() === "delivery" ||
                Boolean(booking.delivery_address);

              return (
                <tr
                  key={booking.id}
                  className="transition hover:bg-muted/30"
                >
                  {/* 1. BOOKING INFO */}
                  <td className="px-3.5 py-3.5 align-middle">
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                      #BK-{booking.id}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(booking.created_at, "short")}
                    </p>
                  </td>

                  {/* 2. VEHICLE DETAILS */}
                  <td className="px-3.5 py-3.5 align-middle">
                    <p className="font-bold text-foreground text-xs leading-tight">
                      {carName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {booking.cars?.type || "Standard Vehicle"}
                    </p>
                  </td>

                  {/* 3. RENTAL WINDOW */}
                  <td className="px-3.5 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <CalendarDays className="size-3.5 text-[#ffcc00] shrink-0" />
                      <span>
                        {formatDate(booking.start_date)} – {formatDate(booking.end_date)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      <span>
                        {formatTime(booking.pickup_time)} to {formatTime(booking.return_time)}
                      </span>
                    </div>
                  </td>

                  {/* 4. FINANCIAL DETAILS */}
                  <td className="px-3.5 py-3.5 align-middle">
                    <p className="font-bold text-foreground">
                      <Money value={booking.total_price} />
                    </p>
                    {booking.down_payment ? (
                      <p className="text-[11px] text-muted-foreground">
                        DP: <Money value={booking.down_payment} />
                      </p>
                    ) : null}
                  </td>

                  {/* 5. FULFILLMENT METHOD */}
                  <td className="px-3.5 py-3.5 text-center align-middle">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground">
                      <Truck className="size-3.5 text-amber-600 dark:text-[#ffcc00]" />
                      <span>{isDelivery ? "Car Delivery" : "Self Pickup"}</span>
                    </span>
                    {booking.delivery_address ? (
                      <p
                        className="mt-1 max-w-[170px] mx-auto truncate text-[11px] text-muted-foreground"
                        title={booking.delivery_address}
                      >
                        {booking.delivery_address}
                      </p>
                    ) : null}
                  </td>

                  {/* 6. STATUS */}
                  <td className="px-3.5 py-3.5 text-center align-middle">
                    <StatusBadge status={booking.status} />
                  </td>

                  {/* 7. ACTION (Strictly ONE clear action button per row) */}
                  <td className="px-3.5 py-3.5 text-right align-middle">
                    <div className="flex items-center justify-end">
                      {booking.status === "Completed" ? (
                        <button
                          type="button"
                          onClick={() => setReviewBooking(booking)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffcc00]/60 bg-[#ffcc00]/15 px-3 py-1.5 text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] transition hover:bg-[#ffcc00] hover:text-black shadow-xs cursor-pointer"
                          title="Rate Your Experience"
                        >
                          <Star className="size-3.5 fill-current" />
                          <span>Review</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTrackStage(booking)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffcc00]/60 bg-[#ffcc00]/10 px-3 py-1.5 text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] transition hover:bg-[#ffcc00] hover:text-black shadow-xs cursor-pointer"
                          title="View Trip Status & Fulfillment"
                        >
                          <Truck className="size-3.5" />
                          <span>Track Trip</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stage Tracker Modal */}
      <TrackStageDialog
        booking={selectedBooking}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onOpenReview={(b) => setReviewBooking(b)}
      />

      {/* Customer Review Modal */}
      <CustomerReviewDialog
        booking={reviewBooking}
        open={Boolean(reviewBooking)}
        onOpenChange={(open) => !open && setReviewBooking(null)}
      />
    </>
  );
}
