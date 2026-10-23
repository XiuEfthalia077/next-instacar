/**
 * Legacy status translation.
 *
 * The PHP app compared booking/car statuses against values that do not exist
 * in the Postgres enums (`Approved`, `Active`, `Ongoing`, `Rented`). In MySQL
 * those comparisons silently matched nothing, so several counters always
 * showed 0. The helpers below keep the *intent* of the original code while
 * using the real enum values.
 *
 * Enum sources: `car-rental/if0_42471936_car_rental.sql`
 *   booking_status = ('Pending','Confirmed','Released','Completed','Cancelled')
 *   car_status     = ('Available','Active','Maintenance','Not Available','Reserved')
 */

import type { BookingStatus, CarStatus } from "@/lib/types";

/** Legacy booking status -> real `booking_status` value. */
export const LEGACY_BOOKING_STATUS: Record<string, BookingStatus> = {
  Approved: "Confirmed",
  Active: "Released",
  Ongoing: "Released",
  Rented: "Released",
  Booked: "Confirmed",
};

/** Legacy car status -> real `car_status` value. */
export const LEGACY_CAR_STATUS: Record<string, CarStatus> = {
  Rented: "Active",
};

/** Translates a list of legacy booking statuses into valid enum values. */
export function bookingStatuses(statuses: string[]): BookingStatus[] {
  const result: BookingStatus[] = [];

  for (const status of statuses) {
    const mapped = LEGACY_BOOKING_STATUS[status] ?? (status as BookingStatus);
    if (!result.includes(mapped)) result.push(mapped);
  }

  return result;
}

/** Translates a list of legacy car statuses into valid enum values. */
export function carStatuses(statuses: string[]): CarStatus[] {
  const result: CarStatus[] = [];

  for (const status of statuses) {
    const mapped = LEGACY_CAR_STATUS[status] ?? (status as CarStatus);
    if (!result.includes(mapped)) result.push(mapped);
  }

  return result;
}

/**
 * Bookings that are still "open" — the legacy
 * `status NOT IN ('Cancelled','Completed')`.
 */
export const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  "Pending",
  "Confirmed",
  "Released",
];

/** Cars that are still part of the rentable fleet — `('Available','Active')`. */
export const ACTIVE_CAR_STATUSES: CarStatus[] = ["Available", "Active"];
