/**
 * Shared query helpers for the dashboard data layer.
 *
 * Everything the legacy PHP app read from MySQL is fetched here through
 * PostgREST so the same branch scoping and role rules apply.
 */

import { getSupabase, type SupabaseServerClient } from "@/lib/auth";
import { manilaToday } from "@/lib/datetime";
import type { AppSession, UserRole } from "@/lib/types";

export type { SupabaseServerClient };

/**
 * Branch filter for the current session — the port of
 * `branchScopeSql()` from `car-rental/config/branch_helper.php`.
 *
 *   admin  -> the branch the admin is currently looking at ("all" = no filter)
 *   staff  -> their own branch
 *   other  -> their own branch
 */
export function branchFilter(session: AppSession): number | null {
  if (session.role === "admin") {
    return session.viewBranch === "all" ? null : session.viewBranch;
  }

  return session.branchId ?? null;
}

/**
 * Branch id written on new records — the port of `currentBranchId()`.
 * An admin browsing "all branches" writes `null` (unassigned).
 */
export function insertBranchId(session: AppSession): number | null {
  return branchFilter(session);
}

/**
 * `YYYY-MM-DD` in Asia/Manila — the timezone of the legacy PHP app
 * (`date_default_timezone_set('Asia/Manila')`).
 */
export function today(): string {
  return manilaToday();
}

/** `YYYY-MM-DD` shifted by `days` (negative = past). */
export function shiftDate(days: number, from = today()): string {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** First day of the month of `date` (`YYYY-MM-01`). */
export function startOfMonth(date = today()): string {
  return `${date.slice(0, 7)}-01`;
}

/** Last day of the month of `date` (`YYYY-MM-DD`). */
export function endOfMonth(date = today()): string {
  const [year, month] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

/**
 * Awaits a PostgREST builder and returns the rows.
 * Errors are logged and turned into an empty result so a page never crashes.
 */
/** Error shape returned by PostgREST (kept loose on purpose). */
type PostgrestLikeError = { message?: string } | null;

function describe(error: PostgrestLikeError): string {
  return error?.message ?? "unknown error";
}

export async function fetchRows<T>(
  builder: PromiseLike<{ data: unknown; error: PostgrestLikeError }>,
): Promise<T[]> {
  const { data, error } = await builder;

  if (error) {
    console.error("[instacar] query failed:", describe(error));
    return [];
  }

  return (data ?? []) as T[];
}

/** Same as {@link fetchRows} but also returns the total row count. */
export async function fetchRowsWithCount<T>(
  builder: PromiseLike<{
    data: unknown;
    error: PostgrestLikeError;
    count?: number | null;
  }>,
): Promise<{ rows: T[]; count: number }> {
  const { data, error, count } = await builder;

  if (error) {
    console.error("[instacar] query failed:", describe(error));
    return { rows: [], count: 0 };
  }

  const rows = (data ?? []) as T[];
  return { rows, count: count ?? rows.length };
}

/**
 * Returns only the number of matching rows.
 * Use with `select("id", { count: "exact", head: true })`.
 */
export async function fetchCount(
  builder: PromiseLike<{
    count?: number | null;
    error: PostgrestLikeError;
  }>,
): Promise<number> {
  const { count, error } = await builder;

  if (error) {
    console.error("[instacar] count query failed:", describe(error));
    return 0;
  }

  return count ?? 0;
}

/**
 * Applies the branch scope to a PostgREST filter builder.
 *
 * Generic on purpose: the supabase-js builders return `this`, so the exact
 * builder type is preserved through the chain.
 */
export function applyBranch<T extends { eq(column: string, value: never): T }>(
  query: T,
  branch: number | null,
  column = "branch_id",
): T {
  return branch === null ? query : query.eq(column, branch as never);
}

/** Normalises a `?page=` query parameter. */
export function readPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Normalises a `?perPage=` query parameter (10 / 25 / 50 / 100). */
export function readPerPage(
  value: string | string[] | undefined,
  fallback = 25,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? String(fallback), 10);
  const allowed = [10, 25, 50, 100];
  return allowed.includes(parsed) ? parsed : fallback;
}

/** The signed-in session, or `null` when nobody is signed in. */
export async function currentSession(): Promise<AppSession | null> {
  const { getSession } = await import("@/lib/auth");
  return getSession();
}

/** Convenience wrapper: the Supabase client bound to the current session. */
export async function db(): Promise<SupabaseServerClient> {
  return getSupabase();
}

/** `true` when the role may see every branch. */
export function seesAllBranches(role: UserRole): boolean {
  return role === "admin";
}
