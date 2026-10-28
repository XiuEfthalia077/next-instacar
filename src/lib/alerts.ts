const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function getManilaToday(): string {
  return new Date(Date.now() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

export function getManilaTomorrow(): string {
  return new Date(Date.now() + MANILA_OFFSET_MS + 86_400_000).toISOString().slice(0, 10);
}

export type BookingAttentionAlert = {
  type: "release" | "return";
  timing: "overdue" | "today" | "tomorrow";
  severity: "urgent" | "warning"; // "urgent" (red/amber) if overdue/today, "warning" (yellow/sky) if tomorrow
  label: string; // "Late Release", "Release Today", "Release Tomorrow", "Late Return", "Return Today", "Return Tomorrow"
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
  const tomorrowStr = getManilaTomorrow();
  const status = booking.status.toLowerCase();

  // 1. Release Actions: status is "confirmed" or "pending"
  if (status === "confirmed" || status === "pending") {
    if (!booking.start_date) return null;
    if (booking.start_date < todayStr) {
      const diffMs = Date.parse(todayStr) - Date.parse(booking.start_date);
      const days = Math.max(1, Math.round(diffMs / 86_400_000));
      return {
        type: "release",
        timing: "overdue",
        severity: "urgent",
        label: "Late Release",
        message:
          days === 1
            ? "This car was supposed to be released 1 day ago."
            : `This car was supposed to be released ${days} days ago.`,
        daysDiff: -days,
      };
    } else if (booking.start_date === todayStr) {
      return {
        type: "release",
        timing: "today",
        severity: "urgent",
        label: "Release Today",
        message: "This car is scheduled to be released today.",
        daysDiff: 0,
      };
    } else if (booking.start_date === tomorrowStr) {
      return {
        type: "release",
        timing: "tomorrow",
        severity: "warning",
        label: "Release Tomorrow",
        message: "This car is scheduled to be released tomorrow.",
        daysDiff: 1,
      };
    }
  }

  // 2. Return Actions: status is "released" or "active"
  if (status === "released" || status === "active") {
    if (!booking.end_date) return null;
    if (booking.end_date < todayStr) {
      const diffMs = Date.parse(todayStr) - Date.parse(booking.end_date);
      const days = Math.max(1, Math.round(diffMs / 86_400_000));
      return {
        type: "return",
        timing: "overdue",
        severity: "urgent",
        label: "Late Return",
        message:
          days === 1
            ? "This car was supposed to be returned 1 day ago."
            : `This car was supposed to be returned ${days} days ago.`,
        daysDiff: -days,
      };
    } else if (booking.end_date === todayStr) {
      return {
        type: "return",
        timing: "today",
        severity: "urgent",
        label: "Return Today",
        message: "This car is scheduled to be returned today.",
        daysDiff: 0,
      };
    } else if (booking.end_date === tomorrowStr) {
      return {
        type: "return",
        timing: "tomorrow",
        severity: "warning",
        label: "Return Tomorrow",
        message: "This car is scheduled to be returned tomorrow.",
        daysDiff: 1,
      };
    }
  }

  return null;
}
