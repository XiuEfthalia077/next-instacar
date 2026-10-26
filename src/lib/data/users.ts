/**
 * User queries — the port of the SQL in
 *   car-rental/pages/admin/users.php
 *   car-rental/pages/admin/staff_manager.php
 *   car-rental/pages/staff/customers.php
 *   car-rental/pages/shared/handlers/user_actions.php
 */

import { applyBranch, branchFilter, fetchRows, fetchRowsWithCount } from "@/lib/data/scope";
import { cleanSearchQuery } from "@/lib/security";
import type { AppSession, User, UserRole } from "@/lib/types";

export type UserWithBranch = User & {
  branches: { id: number; name: string } | null;
};

export type UserFilters = {
  role?: string | null;
  search?: string | null;
  branchId?: number | null;
  isVerified?: boolean | null;
  page?: number;
  perPage?: number;
};

const USER_SELECT = `
  *,
  branches!users_branch_id_fkey ( id, name )
`;

/**
 * Admin user directory (legacy `pages/admin/users.php`).
 * Staff and operators only ever see their own row, so the listing is
 * restricted to admins.
 */
export async function listUsers(
  session: AppSession,
  filters: UserFilters = {},
): Promise<{ rows: UserWithBranch[]; count: number }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 25;

  let query = supabase
    .from("users")
    .select(USER_SELECT, { count: "exact" })
    .order("id", { ascending: false });

  const branch = branchFilter(session);
  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }

  if (filters.branchId) {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.isVerified === true) {
    query = query.eq("is_verified", true);
  }

  if (filters.isVerified === false) {
    query = query.eq("is_verified", false);
  }

  if (filters.search) {
    const clean = cleanSearchQuery(filters.search);
    if (clean) {
      const term = `%${clean}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
  }

  const { rows, count } = await fetchRowsWithCount<UserWithBranch>(
    query.range((page - 1) * perPage, page * perPage - 1),
  );

  return { rows, count };
}

/** The staff members of a branch (legacy `pages/admin/staff_manager.php`). */
export async function listStaff(
  session: AppSession,
  filters: UserFilters = {},
): Promise<UserWithBranch[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("users")
    .select(USER_SELECT)
    .eq("role", "staff")
    .order("name", { ascending: true });

  const branch = branchFilter(session);
  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  if (filters.branchId) {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.search) {
    const clean = cleanSearchQuery(filters.search);
    if (clean) {
      const term = `%${clean}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }
  }

  return fetchRows<UserWithBranch>(query);
}

/** All operators (legacy `pages/admin/operator_revenue.php`). */
export async function listOperators(): Promise<
  { id: number; name: string; email: string; branch_id: number | null }[]
> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  return fetchRows(
    supabase
      .from("users")
      .select("id, name, email, branch_id")
      .eq("role", "operator")
      .order("name", { ascending: true }),
  );
}

/** One user row by id. */
export async function getUser(userId: number): Promise<UserWithBranch | null> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const rows = await fetchRows<UserWithBranch>(
    supabase.from("users").select(USER_SELECT).eq("id", userId).limit(1),
  );

  return rows[0] ?? null;
}

/**
 * The customer directory of the signed-in staff member.
 *
 * Uses the `customer_directory()` RPC (migration
 * `20260101000600_customer_directory.sql`) because the customer list is the
 * union of every customer that has a booking in the staff member's branch.
 */
export async function customerDirectory(
  session: AppSession,
  search?: string | null,
): Promise<
  {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    total_bookings: number;
    active_bookings: number;
    total_spent: number;
    last_booking: string | null;
  }[]
> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const { data, error } = await supabase.rpc("customer_directory", {
    p_branch_id: session.role === "admin" ? null : session.branchId,
    p_search: search?.trim() || null,
  });

  if (error) {
    console.error("[instacar] customer_directory failed:", error.message);
    return [];
  }

  return (data ?? []) as Awaited<ReturnType<typeof customerDirectory>>;
}

/** Counts of the users by role — used by the admin dashboard. */
export async function userCounters(session: AppSession) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const branch = branchFilter(session);

  const customersQuery = supabase.from("users").select("id").eq("role", "user");
  const staffQuery = supabase.from("users").select("id").eq("role", "staff");
  const operatorsQuery = supabase.from("users").select("id").eq("role", "operator");

  const [customers, staff, operators] = await Promise.all([
    fetchRows<{ id: number }>(applyBranch(customersQuery, branch)),
    fetchRows<{ id: number }>(applyBranch(staffQuery, branch)),
    fetchRows<{ id: number }>(applyBranch(operatorsQuery, branch)),
  ]);

  return {
    customers: customers.length,
    staff: staff.length,
    operators: operators.length,
  };
}

/** The role of a user as a plain enum (helper for the staff manager). */
export function isStaffRole(role: UserRole) {
  return role === "staff";
}
