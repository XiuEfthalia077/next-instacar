/**
 * Timezone helpers.
 *
 * The legacy PHP app calls `date_default_timezone_set('Asia/Manila')` and
 * `SET time_zone = '+08:00'`, so every wall clock value it stores, compares or
 * prints is Philippine time. The Next.js server may run in UTC, therefore all
 * date maths has to go through these helpers.
 */

/** Asia/Manila is UTC+8 and has no daylight saving time. */
export const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Wall-clock timestamp of "now" in Asia/Manila, expressed as a UTC epoch. */
export function manilaNowTimestamp(): number {
  return Date.now() + MANILA_OFFSET_MS;
}

/** `YYYY-MM-DD` of "now" in Asia/Manila. */
export function manilaToday(): string {
  return new Date(manilaNowTimestamp()).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD HH:MM:SS` of "now" in Asia/Manila. */
export function manilaNowString(): string {
  return new Date(manilaNowTimestamp()).toISOString().slice(0, 19).replace("T", " ");
}

/** `HH:MM:SS` of "now" in Asia/Manila. */
export function manilaNowTime(): string {
  return new Date(manilaNowTimestamp()).toISOString().slice(11, 19);
}

/**
 * Parses a `YYYY-MM-DD` date + `HH:MM[:SS]` time pair into a wall-clock
 * timestamp (UTC epoch of the same digits). Matches `toTimestamp()` in
 * `src/lib/pricing.ts`.
 */
export function wallClockTimestamp(date: string, time?: string | null): number {
  const [year, month, day] = date.split("-").map(Number);
  const parts = (time ?? "00:00:00").split(":").map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = parts;
  return Date.UTC(year, (month || 1) - 1, day || 1, hours, minutes, seconds);
}

/** Adds `days` to a `YYYY-MM-DD` string. */
export function addDays(date: string, days: number): string {
  const stamp = wallClockTimestamp(date);
  return new Date(stamp + days * 86_400_000).toISOString().slice(0, 10);
}

/** Number of days in the month of `date` (`YYYY-MM-DD`). */
export function daysInMonth(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Month name used by the reports (Jan, Feb, ...). */
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function monthLabel(month: number): string {
  return MONTH_LABELS[Math.min(11, Math.max(0, month - 1))];
}

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Formats a `date` / `timestamp` column the way the legacy pages did.
 *
 * `date` columns (`YYYY-MM-DD`) keep their calendar day; timestamps are
 * rendered in Asia/Manila. Nullish / invalid values become an em dash.
 */
export function formatDate(
  value: string | null | undefined,
  style: "short" | "long" | "iso" | "datetime" = "short",
): string {
  if (!value) return "\u2014";

  // A bare date has no timezone — render its digits directly so the calendar
  // day never shifts by a day.
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (bare) {
    const [, year, month, day] = bare;
    const monthIndex = Number(month) - 1;
    const dayNumber = Number(day);

    if (style === "iso") return value;
    if (style === "long") {
      return `${LONG_MONTHS[monthIndex] ?? month} ${dayNumber}, ${year}`;
    }
    if (style === "datetime") return `${monthLabel(Number(month))} ${dayNumber}, ${year}`;
    return `${monthLabel(Number(month))} ${dayNumber}`;
  }

  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "\u2014";

  const manila = new Date(stamp + MANILA_OFFSET_MS);
  const year = manila.getUTCFullYear();
  const month = manila.getUTCMonth() + 1;
  const day = manila.getUTCDate();

  if (style === "iso") return manila.toISOString().slice(0, 10);
  if (style === "long") return `${LONG_MONTHS[month - 1]} ${day}, ${year}`;
  if (style === "datetime") {
    const time = manila.toISOString().slice(11, 16);
    return `${monthLabel(month)} ${day}, ${year} ${time}`;
  }
  return `${monthLabel(month)} ${day}`;
}

/** `HH:MM` of a `time` column (`HH:MM:SS`). */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "\u2014";
  return value.slice(0, 5);
}

/** Today's date as the legacy `date('F j, Y')` (Asia/Manila). */
export function manilaLongToday(): string {
  return formatDate(manilaToday(), "long");
}
