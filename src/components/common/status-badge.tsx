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

  // Standardized semantic badge colors per Part 1 (low-opacity bg + high contrast text)
  const customTones: Record<string, string> = {
    // Bookings
    Confirmed: "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-extrabold",
    Released: "border-blue-500/30 bg-blue-500/15 text-blue-800 dark:text-blue-400 font-extrabold",
    Pending: "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-extrabold",
    Completed: "border-teal-500/30 bg-teal-500/15 text-teal-800 dark:text-teal-400 font-extrabold",
    Cancelled: "border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-400 font-extrabold",
    // Fleet
    Active: "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-extrabold",
    Available: "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-400 font-extrabold",
    Maintenance: "border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-400 font-extrabold",
    Rented: "border-blue-500/30 bg-blue-500/15 text-blue-800 dark:text-blue-400 font-extrabold",
    Unavailable: "border-neutral-500/30 bg-neutral-500/15 text-neutral-800 dark:text-neutral-400 font-extrabold",
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
