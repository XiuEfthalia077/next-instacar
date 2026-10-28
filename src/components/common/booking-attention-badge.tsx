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

  const isRelease = alert.type === "release";
  const label = isRelease ? "Release Today" : "Return Today";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-500/80 bg-amber-950/80 px-3 py-0.5 text-xs font-black text-[#ffcc00] shadow-sm tracking-wide",
        className,
      )}
      title={alert.message}
    >
      <AlertCircle className="size-3.5 shrink-0 text-[#ffcc00]" />
      <span>{label}</span>
    </span>
  );
}
