import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Booking status pill — mirrors the legacy Bootstrap badge colours
 * (`status_badge.php` / `fetch_bookings.php`).
 */
export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const value = status ?? "—";

  // Pill badge colors matching Screenshot 2
  const customTones: Record<string, string> = {
    Confirmed: "border-transparent bg-[#bbf7d0] text-[#065f46] font-black",
    Released: "border-transparent bg-[#dbeafe] text-[#1e40af] font-black",
    Pending: "border-transparent bg-[#fef3c7] text-[#92400e] font-black",
    Completed: "border-transparent bg-[#e0e7ff] text-[#3730a3] font-black",
    Cancelled: "border-transparent bg-[#fee2e2] text-[#991b1b] font-black",
  };

  const tone =
    customTones[value] ??
    STATUS_BADGE[value] ??
    "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3.5 py-0.5 text-xs font-black uppercase tracking-wider shadow-xs",
        tone,
        className,
      )}
    >
      {value}
    </Badge>
  );
}
