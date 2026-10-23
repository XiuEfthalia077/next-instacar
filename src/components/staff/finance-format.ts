/**
 * Formatting helpers shared by the staff finance screens.
 *
 * The legacy pages formatted their dates and amounts client-side with
 * `toLocaleString('en-PH')` and `date('M d, Y')`; these helpers reproduce the
 * same output while always rendering timestamps in Asia/Manila.
 */

import { MANILA_OFFSET_MS, MONTH_LABELS, formatDate } from "@/lib/datetime";

/** `₱1,234.00` — the legacy `peso()` / `number_format($v, 2)` output. */
export function peso(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;

  return `₱${safe.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Legacy `shortCurrency()`:
 *   1,250,000 -> ₱1.3M · 18,400 -> ₱18.4k · 950 -> ₱950 · 0 -> —
 */
export function shortCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount === 0) return "—";
  if (amount >= 1_000_000) {
    return `₱${Math.round((amount / 1_000_000) * 10) / 10}M`;
  }
  if (amount >= 1_000) {
    return `₱${Math.round((amount / 1_000) * 10) / 10}k`;
  }
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

/**
 * `Oct 23, 2026` for both bare `YYYY-MM-DD` columns and full timestamps.
 * Timestamps are converted to Asia/Manila before the date is taken.
 */
export function dateOnly(value: string | null | undefined): string {
  if (!value) return "—";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDate(value, "datetime");
  }

  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return value;

  const manila = new Date(stamp + MANILA_OFFSET_MS);
  return `${MONTH_LABELS[manila.getUTCMonth()]} ${manila.getUTCDate()}, ${manila.getUTCFullYear()}`;
}

/** `2:05 PM` of a timestamp in Asia/Manila (legacy `date('g:i A')`). */
export function manilaClock(value: string | null | undefined): string {
  if (!value) return "";

  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "";

  const manila = new Date(stamp + MANILA_OFFSET_MS);
  const hours = manila.getUTCHours();
  const minutes = String(manila.getUTCMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const display = hours % 12 === 0 ? 12 : hours % 12;

  return `${display}:${minutes} ${suffix}`;
}

/** `Oct 23, 2026 2:05 PM`. */
export function dateTimeLabel(value: string | null | undefined): string {
  const date = dateOnly(value);
  const time = manilaClock(value);
  return time ? `${date} ${time}` : date;
}

/** Legacy `formatRelativeTime()` used by the settlement history. */
export function relativeTime(value: string | null | undefined): string {
  if (!value) return "";

  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "";

  const diff = Date.now() - stamp;

  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

  return dateOnly(value);
}

/** Initials used by the customer avatars (legacy `customers.php`). */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
