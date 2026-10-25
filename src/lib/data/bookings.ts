/**
 * Booking queries — the port of the SQL in
 *   car-rental/pages/staff/bookings.php
 *   car-rental/pages/admin/bookings_online.php
 *   car-rental/pages/admin/bookings_manual.php
 *   car-rental/pages/operator/bookings.php
 *   car-rental/pages/shared/booking_details.php
 *   car-rental/pages/shared/handlers/fetch_bookings.php
 */

import {
  applyBranch,
  branchFilter,
  fetchCount,
  fetchRows,
  fetchRowsWithCount,
  today,
} from "@/lib/data/scope";
import { bookingStatuses, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import type { AppSession, Booking, BookingStatus } from "@/lib/types";

export type BookingCar = {
  id: number;
  brand: string | null;
  model: string | null;
  plate_number: string | null;
  branch_id: number | null;
  user_id: number | null;
  status: string | null;
  type: string | null;
};

export type BookingCustomer = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type BookingBranch = {
  id: number;
  name: string;
};

export type BookingPaymentRow = {
  id: number;
  booking_id: number;
  daily_rent: number;
  carwash: number;
  extension_fee: number;
  delivery_fee: number;
  jer_delivery_fee: number;
  pickup_fee: number;
  jer_pickup_fee: number;
  fuel: number;
  driver_fee: number;
  damage_fee: number;
  agent_fee: number;
  others: number;
  total_gross: number;
  discount_amount: number;
  total_net: number;
  settled_by: number | null;
  settled_at: string | null;
  operator_share: number;
  remitted_amount: number;
  remittance_date: string | null;
  owner_balance: number;
  remarks: string | null;
  created_at: string | null;
};

/** A booking with the car, the customer and the branch attached. */
export type BookingRow = Booking & {
  cars: BookingCar | null;
  users: BookingCustomer | null;
  branches: BookingBranch | null;
};

const BOOKING_SELECT = `
  *,
  cars!bookings_car_id_fkey (
    id, brand, model, plate_number, branch_id, user_id, status, type
  ),
  users!bookings_user_id_fkey ( id, name, email, phone ),
  branches!bookings_branch_id_fkey ( id, name )
`;

export type BookingFilters = {
  status?: string | null;
  bookingType?: string | null;
  /** Free text over plate number, customer name and guest name. */
  search?: string | null;
  branchId?: number | null;
  carId?: number | null;
  /** Only bookings whose car belongs to this operator (operator pages). */
  carOwnerId?: number | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  perPage?: number;
};

function applyBranchScope<T extends { eq: (column: string, value: never) => T }>(
  query: T,
  session: AppSession,
  column = "branch_id",
): T {
  return applyBranch(query, branchFilter(session), column);
}

/**
 * Mirrors the legacy "auto-cancel cleaner" that ran at the top of
 * `pages/admin/bookings_online.php` and `pages/staff/bookings.php`:
 * every stale Pending online booking becomes Cancelled with the fixed ₱500
 * cancellation fee. Branch-scoped for staff, all branches for admin.
 *
 * Idempotent and safe to call on every render of the online list.
 */
export async function autoCancelStaleBookings(session: AppSession): Promise<number> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const { data, error } = await supabase.rpc("auto_cancel_stale_bookings", {
    // The legacy admin cleaner was global; the staff cleaner was branch-scoped.
    p_branch_id: session.role === "admin" ? null : branchFilter(session),
  });

  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

/**
 * Lists bookings with the same filters the legacy listing pages used.
 * The branch scope is always applied — an admin that is looking at a single
 * branch only sees that branch.
 */
export async function listBookings(
  session: AppSession,
  filters: BookingFilters = {},
): Promise<{ rows: BookingRow[]; count: number }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 25;

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT, { count: "exact" })
    .order("id", { ascending: false });

  query = applyBranchScope(query, session);

  if (filters.status && filters.status !== "all") {
    const wanted = bookingStatuses([filters.status]);
    query = query.in("status", wanted);
  }

  if (filters.bookingType && filters.bookingType !== "all") {
    query = query.eq("booking_type", filters.bookingType);
  }

  if (filters.branchId) {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.carId) {
    query = query.eq("car_id", filters.carId);
  }

  if (filters.from) {
    query = query.gte("start_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("end_date", filters.to);
  }

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `guest_name.ilike.${term},gmail.ilike.${term},phone_number.ilike.${term}`,
    );
  }

  const { rows, count } = await fetchRowsWithCount<BookingRow>(
    query.range((page - 1) * perPage, page * perPage - 1),
  );

  return { rows, count };
}

/** One booking with every detail the detail page shows. */
export async function getBooking(
  session: AppSession,
  bookingId: number,
): Promise<{
  booking: BookingRow | null;
  payment: BookingPaymentRow | null;
  photos: { id: number; file_name: string; uploaded_at: string | null }[];
  remarks: { id: number; remark: string; created_at: string | null; created_by: number | null }[];
  reviews: { id: number; rating: number | null; review_text: string | null; review_title: string | null; status: string; admin_reply: string | null; created_at: string | null }[];
}> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const bookings = await fetchRows<BookingRow>(
    supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", bookingId)
      .limit(1),
  );

  const booking = bookings[0] ?? null;
  if (!booking) {
    return { booking: null, payment: null, photos: [], remarks: [], reviews: [] };
  }

  const [payment, photos, remarks, reviews] = await Promise.all([
    fetchRows<BookingPaymentRow>(
      supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", bookingId)
        .limit(1),
    ),
    fetchRows<{ id: number; file_name: string; uploaded_at: string | null }>(
      supabase
        .from("booking_photos")
        .select("*")
        .eq("booking_id", bookingId)
        .order("id", { ascending: true }),
    ),
    fetchRows<{
      id: number;
      remark: string;
      created_at: string | null;
      created_by: number | null;
    }>(
      supabase
        .from("booking_remarks")
        .select("*")
        .eq("booking_id", bookingId)
        .order("id", { ascending: true }),
    ),
    fetchRows<{
      id: number;
      rating: number | null;
      review_text: string | null;
      review_title: string | null;
      status: string;
      admin_reply: string | null;
      created_at: string | null;
    }>(
      supabase
        .from("reviews")
        .select("*")
        .eq("booking_id", bookingId)
        .order("id", { ascending: true }),
    ),
  ]);

  return {
    booking,
    payment: payment[0] ?? null,
    photos,
    remarks,
    reviews,
  };
}

/** Dashboard counters (legacy staff/operator/admin dashboard queries). */
export async function bookingCounters(session: AppSession) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);
  const day = today();

  const scopedBase = branch === null
    ? supabase.from("bookings").select("id", { count: "exact", head: true })
    : supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("branch_id", branch);

  const [pickupsToday, returnsToday, pending, activeRentals, total, completed] =
    await Promise.all([
      fetchCount(
        scopedBase
          .eq("start_date", day)
          .in("status", OPEN_BOOKING_STATUSES),
      ),
      fetchCount(
        scopedBase.eq("end_date", day).in("status", OPEN_BOOKING_STATUSES),
      ),
      fetchCount(scopedBase.eq("status", "Pending")),
      // The legacy code counted `status = 'Active'`, a value that does not
      // exist in the enum. "Released" is the status that means the car is
      // currently with the customer.
      fetchCount(scopedBase.eq("status", "Released")),
      fetchCount(scopedBase),
      fetchCount(scopedBase.eq("status", "Completed")),
    ]);

  return {
    pickupsToday,
    returnsToday,
    pending,
    activeRentals,
    total,
    completed,
  };
}

/** Today's pickups + returns (legacy "Today's Schedule" block). */
export async function todaySchedule(
  session: AppSession,
  limit = 10,
): Promise<BookingRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);
  const day = today();

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .neq("status", "Cancelled")
    .or(`start_date.eq.${day},end_date.eq.${day}`)
    .order("start_date", { ascending: true })
    .limit(limit);

  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  return fetchRows<BookingRow>(query);
}

/** The most recent bookings (legacy "Recent Bookings" block). */
export async function recentBookings(
  session: AppSession,
  limit = 5,
): Promise<BookingRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("id", { ascending: false })
    .limit(limit);

  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  return fetchRows<BookingRow>(query);
}

/** Bookings of a single customer (legacy `pages/user/mybookings.php`). */
export async function customerBookings(
  session: AppSession,
  userId: number,
  status?: string | null,
): Promise<BookingRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  if (status && status !== "all") {
    query = query.in("status", bookingStatuses([status]));
  }

  return fetchRows<BookingRow>(query);
}

/** Bookings that overlap a car/date range (legacy overlap check). */
export async function overlappingBookings(
  carId: number,
  startDate: string,
  endDate: string,
  ignoreBookingId?: number,
): Promise<BookingRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("car_id", carId)
    .in("status", OPEN_BOOKING_STATUSES)
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  if (ignoreBookingId) {
    query = query.neq("id", ignoreBookingId);
  }

  return fetchRows<BookingRow>(query);
}

/** Calendar events between two dates (legacy `fetch_bookings.php`). */
export async function calendarBookings(
  session: AppSession,
  from: string,
  to: string,
): Promise<BookingRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .gte("start_date", from)
    .lte("end_date", to)
    .order("start_date", { ascending: true });

  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  // Also query maintenance schedules from car_schedules
  const schedQuery = supabase
    .from("car_schedules")
    .select(
      `
      id, car_id, start_date, end_date, reason, notes, created_at,
      cars!car_schedules_car_id_fkey ( id, brand, model, plate_number, type, user_id, branch_id )
    `,
    )
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: true });

  const [bookingRows, schedRows] = await Promise.all([
    fetchRows<BookingRow>(query),
    fetchRows<{
      id: number;
      car_id: number;
      start_date: string;
      end_date: string;
      reason: string;
      notes: string | null;
      created_at: string;
      cars: {
        id: number;
        brand: string;
        model: string;
        plate_number: string;
        type: string;
        user_id?: number | null;
        branch_id?: number | null;
      } | null;
    }>(schedQuery),
  ]);

  const maintenanceEvents: BookingRow[] = [];
  for (const s of schedRows) {
    if (session.role === "operator" && s.cars?.user_id !== session.userId) {
      continue;
    }
    if (branch !== null && s.cars?.branch_id !== branch) {
      continue;
    }

    maintenanceEvents.push({
      id: -s.id,
      user_id: null,
      created_by: null,
      last_action_by: null,
      last_action_at: null,
      last_action_type: null,
      car_id: s.car_id,
      branch_id: s.cars?.branch_id ?? null,
      start_date: s.start_date,
      end_date: s.end_date,
      pickup_time: "08:00:00",
      return_time: "18:00:00",
      status: "Maintenance",
      booking_type: "manual",
      fulfillment_type: "Pickup",
      delivery_address: null,
      return_delivery_address: null,
      total_price: 0,
      discount_price: 0,
      down_payment: 0,
      extension_price: 0,
      extension_hours: 0,
      delivery_fee: 0,
      pickup_fee: 0,
      proof_billing_path: null,
      proof_payment_path: null,
      remarks: s.notes || s.reason,
      guest_name: s.notes ? `Maintenance: ${s.notes}` : `Maintenance (${s.reason})`,
      gmail: null,
      phone_number: null,
      primary_id_path: null,
      secondary_id_path: null,
      created_at: s.created_at,
      cars: s.cars
        ? {
            id: s.cars.id,
            brand: s.cars.brand,
            model: s.cars.model,
            plate_number: s.cars.plate_number,
            branch_id: s.cars.branch_id ?? null,
            user_id: s.cars.user_id ?? null,
            status: "Maintenance",
            type: s.cars.type,
          }
        : null,
      users: null,
      branches: null,
    });
  }

  return [...bookingRows, ...maintenanceEvents];
}

/** Status distribution used by the charts of the dashboards. */
export async function statusBreakdown(session: AppSession) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);

  let query = supabase.from("bookings").select("status");

  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  const rows = await fetchRows<{ status: BookingStatus }>(query);

  const counts = new Map<BookingStatus, number>();
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return counts;
}
