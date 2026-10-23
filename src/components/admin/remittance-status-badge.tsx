import { cn } from "@/lib/utils";

/**
 * Derived remittance status — port of the legacy `$status` computation in
 * `pages/admin/remittance.php` and `pages/admin/operator_revenue.php`.
 *
 *   owed <= 0            -> no-activity
 *   paid <= 0            -> unpaid
 *   paid >= owed         -> paid
 *   otherwise            -> partial
 */
export type RemittanceStatus = "unpaid" | "partial" | "paid" | "no-activity";

export function remittanceStatus(
  totalOwed: number,
  totalPaid: number,
): RemittanceStatus {
  if (totalOwed <= 0) return "no-activity";
  if (totalPaid <= 0) return "unpaid";
  if (totalPaid >= totalOwed) return "paid";
  return "partial";
}

export const REMITTANCE_STATUS_LABEL: Record<RemittanceStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  "no-activity": "No Activity",
};

const STATUS_TONE: Record<RemittanceStatus, string> = {
  unpaid:
    "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
  partial:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  paid: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  "no-activity":
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
};

/** Status pill of the remittance cards (legacy `.status-badge`). */
export function RemittanceStatusBadge({
  status,
  className,
}: {
  status: RemittanceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-wide",
        STATUS_TONE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {REMITTANCE_STATUS_LABEL[status]}
    </span>
  );
}
