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

  // Standardized semantic badge colors (strong legible backgrounds + high contrast text)
  const customTones: Record<string, string> = {
    // Bookings
    Confirmed: "border-emerald-500/40 bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 dark:bg-emerald-500/25 font-black",
    Released: "border-blue-500/40 bg-blue-500/20 text-blue-950 dark:text-blue-300 dark:bg-blue-500/25 font-black",
    Pending: "border-amber-500/40 bg-amber-500/20 text-amber-950 dark:text-amber-300 dark:bg-amber-500/25 font-black",
    Completed: "border-teal-500/40 bg-teal-500/20 text-teal-950 dark:text-teal-300 dark:bg-teal-500/25 font-black",
    Cancelled: "border-rose-500/40 bg-rose-500/20 text-rose-950 dark:text-rose-300 dark:bg-rose-500/25 font-black",
    // Fleet
    Active: "border-emerald-500/40 bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 dark:bg-emerald-500/25 font-black",
    Available: "border-amber-500/40 bg-amber-500/20 text-amber-950 dark:text-amber-300 dark:bg-amber-500/25 font-black",
    Maintenance: "border-rose-500/40 bg-rose-500/20 text-rose-950 dark:text-rose-300 dark:bg-rose-500/25 font-black",
    Rented: "border-blue-500/40 bg-blue-500/20 text-blue-950 dark:text-blue-300 dark:bg-blue-500/25 font-black",
    Unavailable: "border-neutral-500/40 bg-neutral-500/20 text-neutral-900 dark:text-neutral-300 dark:bg-neutral-500/25 font-black",
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
