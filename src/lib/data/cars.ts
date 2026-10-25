/**
 * Car queries — the port of the SQL in
 *   car-rental/pages/shared/cars.php
 *   car-rental/pages/shared/handlers/car_actions.php
 *   car-rental/pages/shared/handlers/schedule_actions.php
 *   car-rental/pages/admin/process/get_available_cars.php
 *   car-rental/pages/user/cars.php
 */

import {
  applyBranch,
  branchFilter,
  fetchCount,
  fetchRows,
  fetchRowsWithCount,
} from "@/lib/data/scope";
import { ACTIVE_CAR_STATUSES, carStatuses } from "@/lib/data/legacy-status";
import type { AppSession, Car, CarStatus } from "@/lib/types";

export type CarWithOwner = Car & {
  users: { id: number; name: string | null; email: string | null } | null;
  branches: { id: number; name: string } | null;
};

const CAR_SELECT = `
  *,
  users!cars_user_id_fkey ( id, name, email ),
  branches!cars_branch_id_fkey ( id, name )
`;

export type CarFilters = {
  status?: string | null;
  type?: string | null;
  search?: string | null;
  branchId?: number | null;
  /** Only the cars of the signed-in operator. */
  ownerId?: number | null;
  page?: number;
  perPage?: number;
};

/** Lists the fleet with the legacy filters. */
export async function listCars(
  session: AppSession,
  filters: CarFilters = {},
): Promise<{ rows: CarWithOwner[]; count: number }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 25;

  let query = supabase
    .from("cars")
    .select(CAR_SELECT, { count: "exact" })
    .order("id", { ascending: false });

  const branch = branchFilter(session);
  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  if (filters.branchId) {
    query = query.eq("branch_id", filters.branchId);
  }

  if (filters.ownerId) {
    query = query.eq("user_id", filters.ownerId);
  }

  if (filters.status && filters.status !== "all") {
    query = query.in("status", carStatuses([filters.status]));
  }

  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `brand.ilike.${term},model.ilike.${term},plate_number.ilike.${term}`,
    );
  }

  const { rows, count } = await fetchRowsWithCount<CarWithOwner>(
    query.range((page - 1) * perPage, page * perPage - 1),
  );

  return { rows, count };
}

/** One car with its owner and branch. */
export async function getCar(carId: number): Promise<CarWithOwner | null> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const rows = await fetchRows<CarWithOwner>(
    supabase.from("cars").select(CAR_SELECT).eq("id", carId).limit(1),
  );

  return rows[0] ?? null;
}

/** Fleet counters for the fleet manager header. */
export async function fleetCounters(session: AppSession) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session);

  const totalQuery = supabase
    .from("cars")
    .select("id", { count: "exact", head: true });

  const availableQuery = supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("status", "Available");

  // The legacy code counted `status IN ('Active','Rented')`; "Rented" does
  // not exist in the enum, "Active" is the rented status.
  const rentedQuery = supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("status", "Active");

  const maintenanceQuery = supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("status", "Maintenance");

  let statusQuery = supabase.from("cars").select("status");

  if (branch !== null) {
    statusQuery = statusQuery.eq("branch_id", branch);
  }

  const [total, available, rented, maintenance, statusRows] = await Promise.all([
    fetchCount(applyBranch(totalQuery, branch)),
    fetchCount(applyBranch(availableQuery, branch)),
    fetchCount(applyBranch(rentedQuery, branch)),
    fetchCount(applyBranch(maintenanceQuery, branch)),
    fetchRows<{ status: CarStatus }>(statusQuery),
  ]);

  const cars = statusRows.map((row) => row.status);

  return { total, available, rented, maintenance, cars };
}

/** The distinct car types (legacy `SELECT DISTINCT type FROM cars ...`). */
export async function carTypes(session: AppSession, branchId?: number): Promise<string[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const branch = branchFilter(session) ?? (branchId !== undefined ? branchId : null);

  let query = supabase.from("cars").select("type").in("status", ACTIVE_CAR_STATUSES);

  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  const rows = await fetchRows<{ type: string | null }>(query);

  return [...new Set(rows.map((row) => row.type).filter((value): value is string => !!value))].sort();
}

/**
 * Cars that can be booked for a date range (legacy
 * `pages/admin/process/get_available_cars.php`).
 */
export async function availableCars(
  branchId: number | null,
  startDate: string,
  endDate: string,
): Promise<CarWithOwner[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("cars")
    .select(CAR_SELECT)
    .in("status", ACTIVE_CAR_STATUSES);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const cars = await fetchRows<CarWithOwner>(query);

  if (cars.length === 0) return cars;

  const carIds = cars.map((car) => car.id);

  const busy = await fetchRows<{ car_id: number }>(
    supabase
      .from("bookings")
      .select("car_id")
      .in("car_id", carIds)
      .in("status", ["Pending", "Confirmed", "Released"])
      .lte("start_date", endDate)
      .gte("end_date", startDate),
  );

  const busyIds = new Set(busy.map((row) => row.car_id));

  return cars.filter((car) => !busyIds.has(car.id));
}

/** Cars of the signed-in operator (legacy `pages/operator/view_car.php`). */
export async function operatorCars(session: AppSession): Promise<CarWithOwner[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  return fetchRows<CarWithOwner>(
    supabase
      .from("cars")
      .select(CAR_SELECT)
      .eq("user_id", session.userId)
      .order("id", { ascending: false }),
  );
}

/** All branches (used by the branch switcher and the branch pages). */
export async function listBranches(activeOnly = false) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase.from("branches").select("*").order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  return fetchRows<{
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    created_at: string;
  }>(query);
}

/** Blocked periods of a car (legacy `car_schedules`). */
export async function carSchedules(carId: number) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  return fetchRows<{
    id: number;
    car_id: number;
    created_by: number | null;
    start_date: string;
    end_date: string;
    reason: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>(
    supabase
      .from("car_schedules")
      .select("*")
      .eq("car_id", carId)
      .order("start_date", { ascending: false }),
  );
}

/** Bookings of a single car (legacy `pages/user/process/get_car_bookings.php`). */
export async function carBookings(carId: number) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  return fetchRows<{
    id: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
  }>(
    supabase
      .from("bookings")
      .select("id, start_date, end_date, status")
      .eq("car_id", carId)
      .order("start_date", { ascending: false }),
  );
}
