import { formatPeso } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Money cell — mirrors the legacy `number_format($v, 2)` output with the
 * peso sign.
 */
export function Money({
  value,
  className,
  showSign = true,
}: {
  value: number | string | null | undefined;
  className?: string;
  showSign?: boolean;
}) {
  const amount = Number(value ?? 0);
  const formatted = showSign
    ? formatPeso(amount)
    : amount.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return (
    <span className={cn("tabular-nums", className)}>{formatted}</span>
  );
}
