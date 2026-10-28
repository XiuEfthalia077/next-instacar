const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getManilaToday(): string {
  return new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

export type BookingAttentionAlert = {
  type: "release" | "return";
  severity: "urgent" | "warning"; // "urgent" (red) if days ago, "warning" (yellow) if today
  message: string;
  daysDiff: number;
};

export function getBookingAttentionAlert(booking: {
  status?: string | null | undefined;
  start_date?: string | null | undefined;
  end_date?: string | null | undefined;
  pickup_time?: string | null | undefined;
  return_time?: string | null | undefined;
}): BookingAttentionAlert | null {
  if (!booking.status) return null;

  const todayStr = getManilaToday();
  const status = booking.status.toLowerCase();

  // 1. Overdue for Release: status is "confirmed" or "pending"
  if (status === "confirmed" || status === "pending") {
    if (!booking.start_date) return null;
    if (booking.start_date < todayStr) {
      const diffMs = Date.parse(todayStr) - Date.parse(booking.start_date);
      const days = Math.max(1, Math.round(diffMs / 86_400_000));
      return {
        type: "release",
        severity: "urgent",
        message:
          days === 1
            ? "Car was supposed to be released 1 day ago."
            : `Car was supposed to be released ${days} days ago.`,
        daysDiff: days,
      };
    } else if (booking.start_date === todayStr) {
      return {
        type: "release",
        severity: "warning",
        message: "Car was supposed to be released today.",
        daysDiff: 0,
      };
    }
  }

  // 2. Overdue for Return: status is "released" or "active"
  if (status === "released" || status === "active") {
    if (!booking.end_date) return null;
    if (booking.end_date < todayStr) {
      const diffMs = Date.parse(todayStr) - Date.parse(booking.end_date);
      const days = Math.max(1, Math.round(diffMs / 86_400_000));
      return {
        type: "return",
        severity: "urgent",
        message:
          days === 1
            ? "Car was supposed to be returned 1 day ago."
            : `Car was supposed to be returned ${days} days ago.`,
        daysDiff: days,
      };
    } else if (booking.end_date === todayStr) {
      return {
        type: "return",
        severity: "warning",
        message: "Car was supposed to be returned today.",
        daysDiff: 0,
      };
    }
  }

  return null;
}
