import { manilaNowTimestamp, wallClockTimestamp } from "@/lib/datetime";

export type BookingUrgencyInfo = {
  isUrgent: boolean;
  type: "release" | "return" | "overdue";
  message: string;
  badgeClass: string;
  dotClass: string;
  hoursRemaining: number;
} | null;

/**
 * Calculates whether a vehicle booking has an upcoming release or return within 48 hours (2 days),
 * or is overdue for release / return.
 */
export function getBookingUrgency(booking: {
  start_date?: string | null;
  pickup_time?: string | null;
  end_date?: string | null;
  return_time?: string | null;
  status?: string | null;
}): BookingUrgencyInfo {
  const status = booking.status || "";
  if (status === "Cancelled" || status === "Completed" || status === "Maintenance") {
    return null;
  }

  const now = manilaNowTimestamp();

  // 1. Check Return Date & Time (if vehicle is currently out or confirmed)
  if (booking.end_date) {
    const returnTime = booking.return_time || "23:59:00";
    const returnStamp = wallClockTimestamp(booking.end_date, returnTime);
    const msDiff = returnStamp - now;
    const hoursDiff = msDiff / (1000 * 60 * 60);

    // Overdue Return
    if (msDiff < 0 && (status === "Released" || status === "Confirmed")) {
      return {
        isUrgent: true,
        type: "overdue",
        message: "Return overdue!",
        badgeClass:
          "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40 animate-pulse font-black",
        dotClass: "bg-rose-600 animate-ping ring-2 ring-rose-500",
        hoursRemaining: hoursDiff,
      };
    }

    // Return within 48 hours (2 days)
    if (hoursDiff >= 0 && hoursDiff <= 48 && (status === "Released" || status === "Confirmed")) {
      const days = Math.ceil(hoursDiff / 24);
      let label = "Return in 2 days";
      if (hoursDiff <= 12) {
        label = "Return today";
      } else if (hoursDiff <= 24 || days === 1) {
        label = "Return tomorrow";
      }

      return {
        isUrgent: true,
        type: "return",
        message: `Urgent: ${label}`,
        badgeClass:
          "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-black",
        dotClass: "bg-rose-500 animate-pulse ring-1 ring-rose-500/40",
        hoursRemaining: hoursDiff,
      };
    }
  }

  // 2. Check Release Date & Time (if vehicle is pending handoff or confirmed)
  if (booking.start_date && (status === "Confirmed" || status === "Pending")) {
    const pickupTime = booking.pickup_time || "00:00:00";
    const releaseStamp = wallClockTimestamp(booking.start_date, pickupTime);
    const msDiff = releaseStamp - now;
    const hoursDiff = msDiff / (1000 * 60 * 60);

    // Overdue Release
    if (msDiff < 0) {
      return {
        isUrgent: true,
        type: "overdue",
        message: "Release overdue!",
        badgeClass:
          "bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-500/40 animate-pulse font-black",
        dotClass: "bg-amber-500 animate-ping ring-2 ring-amber-500",
        hoursRemaining: hoursDiff,
      };
    }

    // Release within 48 hours (2 days)
    if (hoursDiff >= 0 && hoursDiff <= 48) {
      const days = Math.ceil(hoursDiff / 24);
      let label = "Release in 2 days";
      if (hoursDiff <= 12) {
        label = "Release today";
      } else if (hoursDiff <= 24 || days === 1) {
        label = "Release in 1 day";
      }

      return {
        isUrgent: true,
        type: "release",
        message: `Urgent: ${label}`,
        badgeClass:
          "bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 font-black",
        dotClass: "bg-amber-500 animate-pulse ring-1 ring-amber-500/40",
        hoursRemaining: hoursDiff,
      };
    }
  }

  return null;
}
