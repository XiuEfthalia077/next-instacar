import * as React from "react";
import { AlertCircle, TriangleAlert } from "lucide-react";
import { getBookingAttentionAlert } from "@/lib/data/bookings";
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

  const isUrgent = alert.severity === "urgent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-tight shadow-xs",
        isUrgent
          ? "border border-rose-500/40 bg-rose-500/15 text-rose-400 animate-pulse"
          : "border border-amber-500/40 bg-amber-500/15 text-amber-400",
        className,
      )}
      title={alert.message}
    >
      {isUrgent ? (
        <TriangleAlert className="size-3 shrink-0 text-rose-500" />
      ) : (
        <AlertCircle className="size-3 shrink-0 text-amber-500" />
      )}
      <span>{alert.type === "release" ? (isUrgent ? "Overdue Release" : "Release Today") : (isUrgent ? "Overdue Return" : "Return Today")}</span>
    </span>
  );
}
