/**
 * Remaining dashboard queries — the port of the SQL in
 *   car-rental/pages/admin/review_list.php
 *   car-rental/pages/admin/contact_messages.php
 *   car-rental/pages/admin/branches.php
 */

import { branchFilter, fetchCount, fetchRows, today } from "@/lib/data/scope";
import { MANILA_OFFSET_MS, manilaNowTimestamp } from "@/lib/datetime";
import type { AppSession } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

export type ReviewRow = {
  id: number;
  user_id: number | null;
  booking_id: number | null;
  rating: number | null;
  review_text: string | null;
  review_title: string | null;
  admin_reply: string | null;
  status: string;
  created_at: string | null;
  customer_name: string | null;
  brand: string | null;
  model: string | null;
  plate_number: string | null;
};

export type ReviewFilters = {
  rating?: number | null;
  status?: string | null;
  /** "pending_reply" | "replied" | "all" */
  reply?: string | null;
};

/** Legacy `pages/admin/review_list.php`. */
export async function listReviews(
  session: AppSession,
  filters: ReviewFilters = {},
): Promise<ReviewRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("reviews")
    .select(
      `
      *,
      users!reviews_user_id_fkey ( id, name ),
      bookings!reviews_booking_id_fkey (
        id, branch_id,
        cars!bookings_car_id_fkey ( id, brand, model, plate_number )
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (filters.rating) {
    query = query.eq("rating", filters.rating);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.reply === "pending_reply") {
    query = query.or("admin_reply.is.null,admin_reply.eq.");
  }

  if (filters.reply === "replied") {
    query = query.not("admin_reply", "is", null).neq("admin_reply", "");
  }

  const branch = branchFilter(session);
  if (branch !== null) {
    query = query.eq("bookings.branch_id", branch);
  }

  const rows = await fetchRows<{
    id: number;
    user_id: number | null;
    booking_id: number | null;
    rating: number | null;
    review_text: string | null;
    review_title: string | null;
    admin_reply: string | null;
    status: string;
    created_at: string | null;
    users: { id: number; name: string | null } | null;
    bookings: {
      id: number;
      branch_id: number | null;
      cars: { id: number; brand: string | null; model: string | null; plate_number: string | null } | null;
    } | null;
  }>(query);

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    booking_id: row.booking_id,
    rating: row.rating,
    review_text: row.review_text,
    review_title: row.review_title,
    admin_reply: row.admin_reply,
    status: row.status,
    created_at: row.created_at,
    customer_name: row.users?.name ?? null,
    brand: row.bookings?.cars?.brand ?? null,
    model: row.bookings?.cars?.model ?? null,
    plate_number: row.bookings?.cars?.plate_number ?? null,
  }));
}

/** Reviews that still need an admin reply (legacy dashboard counter). */
export async function pendingReplyCount(session: AppSession): Promise<number> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("reviews")
    .select("id, bookings!reviews_booking_id_fkey(branch_id)")
    .or("admin_reply.is.null,admin_reply.eq.");

  const branch = branchFilter(session);
  if (branch !== null) {
    query = query.eq("bookings.branch_id", branch);
  }

  const rows = await fetchRows<{ id: number }>(query);
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Contact messages                                                     */
/* ------------------------------------------------------------------ */

export type ContactMessage = {
  id: number;
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
};

/** Legacy `pages/admin/contact_messages.php` (newest first). */
export async function listContactMessages(): Promise<ContactMessage[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  return fetchRows<ContactMessage>(
    supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
  );
}

/* ------------------------------------------------------------------ */
/* Branches                                                             */
/* ------------------------------------------------------------------ */

export type BranchWithCounts = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  staff_count: number;
  car_count: number;
  booking_count: number;
};

/** Legacy `pages/admin/branches.php` branch cards with their counters. */
export async function listBranchesWithCounts(): Promise<BranchWithCounts[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const branches = await fetchRows<{
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    created_at: string;
  }>(supabase.from("branches").select("*").order("is_active", { ascending: false }).order("name", { ascending: true }));

  const [staff, cars, bookings] = await Promise.all([
    fetchRows<{ id: number; branch_id: number | null; role: string }>(
      supabase.from("users").select("id, branch_id, role").in("role", ["staff", "operator"]),
    ),
    fetchRows<{ id: number; branch_id: number | null }>(supabase.from("cars").select("id, branch_id")),
    fetchRows<{ id: number; branch_id: number | null }>(supabase.from("bookings").select("id, branch_id")),
  ]);

  const countBy = (rows: { branch_id: number | null }[], branchId: number) =>
    rows.filter((row) => row.branch_id === branchId).length;

  return branches.map((branch) => ({
    ...branch,
    staff_count: countBy(staff, branch.id),
    car_count: countBy(cars, branch.id),
    booking_count: countBy(bookings, branch.id),
  }));
}

/* ------------------------------------------------------------------ */
/* Admin dashboard                                                      */
/* ------------------------------------------------------------------ */

export type AdminDashboardStats = {
  totalCars: number;
  availableCars: number;
  activeBookings: number;
  totalBookings: number;
  completedThisMonth: number;
  monthlyNet: number;
  totalNet: number;
  totalGross: number;
  pendingBookings: number;
  totalCustomers: number;
  totalOperators: number;
  unreadMessages: number;
};

/**
 * Legacy `pages/admin/dashboard.php` counters.
 *
 * `totalCustomers` is deliberately company-wide (the legacy comment says
 * customers are not branch scoped), while every other number follows the
 * admin's current branch selection.
 */
export async function adminDashboardStats(
  session: AppSession,
): Promise<AdminDashboardStats> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);
  const day = today();

  const now = new Date(manilaNowTimestamp());
  const monthStart =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - MANILA_OFFSET_MS;
  const monthEnd =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - MANILA_OFFSET_MS;

  const countCars = supabase.from("cars").select("id", { count: "exact", head: true });
  const countAvailable = supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("status", "Available");
  const countActive = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "Confirmed")
    .lte("start_date", day)
    .gte("end_date", day);
  const countAllBookings = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });
  const countCompleted = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "Completed")
    .gte("created_at", new Date(monthStart).toISOString())
    .lt("created_at", new Date(monthEnd).toISOString());
  const countPending = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "Pending");
  const countCustomers = supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "user");
  const countOperators = supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "operator");
  const countUnread = supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  const scoped = <T extends { eq(column: string, value: never): T }>(query: T) =>
    branch === null ? query : query.eq("branch_id", branch as never);

  const [totalCars, availableCars, activeBookings, totalBookings, completedThisMonth, pendingBookings, totalCustomers, totalOperators, unreadMessages, payments] =
    await Promise.all([
      fetchCount(scoped(countCars)),
      fetchCount(scoped(countAvailable)),
      fetchCount(scoped(countActive)),
      fetchCount(scoped(countAllBookings)),
      fetchCount(scoped(countCompleted)),
      fetchCount(scoped(countPending)),
      fetchCount(countCustomers),
      fetchCount(scoped(countOperators)),
      fetchCount(countUnread),
      fetchRows<{
        total_net: number | null;
        total_gross: number | null;
        created_at: string | null;
        bookings: { branch_id: number | null } | null;
      }>(
        supabase
          .from("booking_payments")
          .select(
            "total_net, total_gross, created_at, bookings!booking_payments_booking_id_fkey(branch_id)",
          ),
      ),
    ]);

  let monthlyNet = 0;
  let totalNet = 0;
  let totalGross = 0;

  for (const payment of payments) {
    if (branch !== null && payment.bookings?.branch_id !== branch) continue;

    const net = Number(payment.total_net ?? 0);
    const gross = Number(payment.total_gross ?? 0);
    totalNet += net;
    totalGross += gross;

    const stamp = payment.created_at ? new Date(payment.created_at).getTime() : 0;
    if (stamp >= monthStart && stamp < monthEnd) monthlyNet += net;
  }

  return {
    totalCars,
    availableCars,
    activeBookings,
    totalBookings,
    completedThisMonth,
    monthlyNet,
    totalNet,
    totalGross,
    pendingBookings,
    totalCustomers,
    totalOperators,
    unreadMessages,
  };
}


/* ------------------------------------------------------------------ */
/* Site content                                                         */
/* ------------------------------------------------------------------ */

/** Every editable site content entry, keyed by `content_key`. */
export async function siteContent(): Promise<Record<string, string>> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const rows = await fetchRows<{ content_key: string; content_value: string | null }>(
    supabase.from("site_content").select("content_key, content_value"),
  );

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.content_key] = row.content_value ?? "";
  }
  return map;
}
