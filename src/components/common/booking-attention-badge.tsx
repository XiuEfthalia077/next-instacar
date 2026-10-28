import * as React from "react";
import { AlertCircle } from "lucide-react";
import { getBookingAttentionAlert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function BookingAttentionBadge({
  booking,
  className,
}: {
  booking: {
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    pickup_time?: string | null;
    return_time?: string | null;
  };
  className?: string;
}) {
  const alert = getBookingAttentionAlert(booking);
  if (!alert) return null;

  const label =
    alert.timing === "overdue"
      ? "Late"
      : alert.type === "release"
        ? alert.timing === "tomorrow"
          ? "Release Tomorrow"
          : "Release Today"
        : alert.timing === "tomorrow"
          ? "Return Tomorrow"
          : "Return Today";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#ffcc00] bg-[#2a1a00] px-3 py-0.5 text-xs font-black text-[#ffcc00] shadow-sm tracking-tight shrink-0 whitespace-nowrap",
        className,
      )}
      title={alert.message}
    >
      <AlertCircle className="size-3.5 shrink-0 text-[#ffcc00]" />
      <span>{label}</span>
    </span>
  );
}
