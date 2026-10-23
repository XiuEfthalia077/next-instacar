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
  const tone = STATUS_BADGE[value] ?? "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tone,
        className,
      )}
    >
      {value}
    </Badge>
  );
}
