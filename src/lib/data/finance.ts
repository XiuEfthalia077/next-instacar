/**
 * Financial queries — the port of the SQL in
 *   car-rental/pages/admin/admin_revenue.php
 *   car-rental/pages/admin/income.php
 *   car-rental/pages/admin/settlements.php
 *   car-rental/pages/admin/remittance.php
 *   car-rental/pages/admin/operator_revenue.php
 *   car-rental/pages/admin/expenses.php
 *   car-rental/pages/staff/staff_gross.php
 *   car-rental/pages/staff/staff_revenue.php
 *   car-rental/pages/staff/staff_settlements.php
 *   car-rental/pages/operator/revenue.php
 *
 * PostgREST cannot do `GROUP BY` aggregations, so every aggregate is
 * computed in TypeScript from the raw rows. The formulas are identical to the
 * legacy SQL.
 */

import { branchFilter, fetchRows } from "@/lib/data/scope";
import { MANILA_OFFSET_MS, manilaNowTimestamp } from "@/lib/datetime";
import type { AppSession } from "@/lib/types";

/** Coerces a PostgREST numeric (number | string | null) to a number. */
export function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PaymentCar = {
  id: number;
  brand: string | null;
  model: string | null;
  plate_number: string | null;
  branch_id: number | null;
  user_id: number | null;
  status: string | null;
};

export type PaymentBooking = {
  id: number;
  booking_type: string | null;
  status: string | null;
  branch_id: number | null;
  car_id: number | null;
  user_id: number | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
  total_price: number | null;
  guest_name: string | null;
  created_at: string | null;
  cars: PaymentCar | null;
  users: { id: number; name: string | null; email: string | null; phone: string | null } | null;
};

export type PaymentRow = {
  id: number;
  booking_id: number;
  daily_rent: number | null;
  carwash: number | null;
  extension_fee: number | null;
  delivery_fee: number | null;
  jer_delivery_fee: number | null;
  pickup_fee: number | null;
  jer_pickup_fee: number | null;
  fuel: number | null;
  driver_fee: number | null;
  damage_fee: number | null;
  agent_fee: number | null;
  others: number | null;
  total_gross: number | null;
  discount_amount: number | null;
  total_net: number | null;
  operator_share: number | null;
  settled_by: number | null;
  settled_at: string | null;
  created_at: string | null;
  remitted_amount: number | null;
  remittance_date: string | null;
  owner_balance: number | null;
  remarks: string | null;
  bookings: PaymentBooking | null;
  users: { id: number; name: string | null; role: string | null } | null;
};

const PAYMENT_SELECT = `
  *,
  bookings!booking_payments_booking_id_fkey (
    id, booking_type, status, branch_id, car_id, user_id,
    start_date, end_date, pickup_time, return_time, total_price,
    guest_name, created_at,
    cars!bookings_car_id_fkey (
      id, brand, model, plate_number, branch_id, user_id, status
    ),
    users!bookings_user_id_fkey ( id, name, email, phone )
  ),
  users!booking_payments_settled_by_fkey ( id, name, role )
`;

/** Period filters used by the revenue pages. */
export type Period = "all" | "this_month" | "last_30d" | "this_quarter";

export const PERIODS: Period[] = ["all", "this_month", "last_30d", "this_quarter"];

function periodStart(period: Period): Date | null {
  const now = new Date(manilaNowTimestamp());

  if (period === "all") return null;

  if (period === "this_month") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
  }

  if (period === "last_30d") {
    return new Date(now.getTime() - 30 * 86_400_000);
  }

  if (period === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    return new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1));
  }

  return null;
}

/** `true` when `value` falls inside the requested period. */
export function withinPeriod(value: string | null | undefined, period: Period): boolean {
  const start = periodStart(period);
  if (!start) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start.getTime();
}

/** Manila wall-clock timestamp of an ISO timestamp / date string. */
function manilaStamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return null;
  return parsed + MANILA_OFFSET_MS;
}

/** The month (1-12) of an ISO timestamp / date string, in Asia/Manila. */
export function monthOf(value: string | null | undefined): number {
  const stamp = manilaStamp(value);
  if (stamp === null) return 0;
  return new Date(stamp).getUTCMonth() + 1;
}

/** The year of an ISO timestamp / date string, in Asia/Manila. */
export function yearOf(value: string | null | undefined): number {
  const stamp = manilaStamp(value);
  if (stamp === null) return 0;
  return new Date(stamp).getUTCFullYear();
}

/** Year of the legacy `?year=` filter (defaults to the current year). */
export function currentYear(): number {
  return new Date(manilaNowTimestamp()).getUTCFullYear();
}

/** The list of years that have data — used by the year pickers. */
export function yearOptions(years: number[]): number[] {
  const now = currentYear();
  const set = new Set<number>([now]);
  years.forEach((year) => {
    if (year >= 2000 && year <= now + 1) set.add(year);
  });
  return [...set].sort((a, b) => b - a);
}

/* ------------------------------------------------------------------ */
/* Payment rows                                                         */
/* ------------------------------------------------------------------ */

/**
 * All payment rows with the booking, car and customer attached.
 * The branch scope is applied through `bookings.branch_id`.
 */
export async function listPayments(
  session: AppSession,
  options: {
    year?: number | null;
    /** Which timestamp drives the year filter. */
    dateField?: "settled_at" | "created_at";
    branchId?: number | null;
    carId?: number | null;
    /** Only payments of cars owned by this operator. */
    carOwnerId?: number | null;
    bookingType?: string | null;
    period?: Period;
  } = {},
): Promise<PaymentRow[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("booking_payments")
    .select(PAYMENT_SELECT)
    .order("id", { ascending: false });

  const branch = options.branchId ?? branchFilter(session);
  if (branch !== null) {
    query = query.eq("bookings.branch_id", branch);
  }

  if (options.carId) {
    query = query.eq("bookings.car_id", options.carId);
  }

  if (options.bookingType && options.bookingType !== "all") {
    query = query.eq("bookings.booking_type", options.bookingType);
  }

  const rows = await fetchRows<PaymentRow>(query);

  return rows.filter((row) => {
    if (options.year) {
      const stamp =
        options.dateField === "created_at"
          ? (row.created_at ?? row.bookings?.created_at ?? null)
          : (row.settled_at ?? null);

      if (yearOf(stamp) !== options.year) return false;
    }

    if (options.period && options.period !== "all") {
      const stamp =
        options.dateField === "created_at"
          ? (row.created_at ?? row.bookings?.created_at ?? null)
          : (row.settled_at ?? null);

      if (!withinPeriod(stamp, options.period)) return false;
    }

    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Income statement                                                     */
/* ------------------------------------------------------------------ */

export type IncomeMonth = {
  month: number;
  gross: number;
  operator: number;
  staffAgent: number;
  expenses: number;
  net: number;
};

/**
 * Legacy `pages/admin/income.php`.
 *
 *   gross      = SUM(booking_payments.total_gross)
 *   operator   = SUM(booking_payments.operator_share)
 *   staffAgent = SUM(booking_payments.total_gross - booking_payments.total_net)
 *   expenses   = SUM(expenses.amount)
 */
export async function incomeStatement(
  session: AppSession,
  year: number,
): Promise<{ months: IncomeMonth[]; totals: Omit<IncomeMonth, "month"> }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const payments = await fetchRows<{
    total_gross: number | null;
    total_net: number | null;
    operator_share: number | null;
    created_at: string | null;
  }>(supabase.from("booking_payments").select("total_gross, total_net, operator_share, created_at"));

  const expenses = await fetchRows<{
    amount: number | null;
    expense_date: string | null;
  }>(supabase.from("expenses").select("amount, expense_date"));

  const months = new Map<number, IncomeMonth>();

  const bucket = (month: number): IncomeMonth => {
    let row = months.get(month);
    if (!row) {
      row = {
        month,
        gross: 0,
        operator: 0,
        staffAgent: 0,
        expenses: 0,
        net: 0,
      };
      months.set(month, row);
    }
    return row;
  };

  for (const payment of payments) {
    if (yearOf(payment.created_at) !== year) continue;
    const row = bucket(monthOf(payment.created_at));
    const gross = num(payment.total_gross);
    row.gross += gross;
    row.operator += num(payment.operator_share);
    row.staffAgent += gross - num(payment.total_net);
  }

  for (const expense of expenses) {
    if (yearOf(expense.expense_date) !== year) continue;
    bucket(monthOf(expense.expense_date)).expenses += num(expense.amount);
  }

  const rows = [...months.values()].sort((a, b) => a.month - b.month);

  for (const row of rows) {
    row.net = row.gross - row.operator - row.expenses;
  }

  const totals = rows.reduce(
    (acc, row) => ({
      gross: acc.gross + row.gross,
      operator: acc.operator + row.operator,
      staffAgent: acc.staffAgent + row.staffAgent,
      expenses: acc.expenses + row.expenses,
      net: acc.net + row.net,
    }),
    { gross: 0, operator: 0, staffAgent: 0, expenses: 0, net: 0 },
  );

  return { months: rows, totals };
}

/* ------------------------------------------------------------------ */
/* Fleet revenue (admin_revenue.php)                                    */
/* ------------------------------------------------------------------ */

export type FleetRevenueCar = {
  carId: number;
  brand: string | null;
  model: string | null;
  plateNumber: string | null;
  months: { month: number; gross: number }[];
  total: number;
};

/**
 * Legacy `pages/admin/admin_revenue.php`.
 *
 * Per car and month gross, where the month is taken from
 * `COALESCE(p.created_at, b.created_at)`.
 */
export async function fleetRevenue(
  session: AppSession,
  options: {
    year: number;
    period?: Period;
    bookingType?: string | null;
    carId?: number | null;
  },
): Promise<FleetRevenueCar[]> {
  const rows = await listPayments(session, {
    year: options.year,
    dateField: "created_at",
    period: options.period ?? "all",
    bookingType: options.bookingType,
    carId: options.carId,
  });

  const cars = new Map<
    number,
    { brand: string | null; model: string | null; plateNumber: string | null; months: Map<number, number> }
  >();

  for (const row of rows) {
    const car = row.bookings?.cars;
    if (!car) continue;

    const stamp = row.created_at ?? row.bookings?.created_at ?? null;
    const month = monthOf(stamp);

    let entry = cars.get(car.id);
    if (!entry) {
      entry = { brand: car.brand, model: car.model, plateNumber: car.plate_number, months: new Map() };
      cars.set(car.id, entry);
    }

    entry.months.set(month, (entry.months.get(month) ?? 0) + num(row.total_gross));
  }

  return [...cars.entries()]
    .map(([carId, entry]) => {
      const months = [...entry.months.entries()]
        .map(([month, gross]) => ({ month, gross }))
        .sort((a, b) => a.month - b.month);

      return {
        carId,
        brand: entry.brand,
        model: entry.model,
        plateNumber: entry.plateNumber,
        months,
        total: months.reduce((acc, item) => acc + item.gross, 0),
      };
    })
    .sort((a, b) => {
      const brand = (a.brand ?? "").localeCompare(b.brand ?? "");
      if (brand !== 0) return brand;
      return (a.model ?? "").localeCompare(b.model ?? "");
    });
}

/* ------------------------------------------------------------------ */
/* Expense / fee breakdown (admin/expenses.php)                        */
/* ------------------------------------------------------------------ */

export type ExpenseBreakdownMonth = {
  month: number;
  daily_rent: number;
  carwash: number;
  extension_fee: number;
  delivery_fee: number;
  pickup_fee: number;
  fuel: number;
  driver_fee: number;
  damage_fee: number;
  agent_fee: number;
  others: number;
  total_gross: number;
  total_net: number;
};

export const EXPENSE_FEE_FIELDS = [
  "daily_rent",
  "carwash",
  "extension_fee",
  "delivery_fee",
  "pickup_fee",
  "fuel",
  "driver_fee",
  "damage_fee",
  "agent_fee",
  "others",
] as const;

export type ExpenseFeeField = (typeof EXPENSE_FEE_FIELDS)[number];

/**
 * Legacy `pages/admin/expenses.php` — the monthly fee breakdown of one car.
 * The month is taken from `bookings.start_date`.
 */
export async function expenseBreakdown(
  session: AppSession,
  carId: number,
  year: number,
): Promise<{ months: ExpenseBreakdownMonth[]; totals: Omit<ExpenseBreakdownMonth, "month"> }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const rows = await fetchRows<PaymentRow>(
    supabase
      .from("booking_payments")
      .select(PAYMENT_SELECT)
      .eq("bookings.car_id", carId),
  );

  const months = new Map<number, ExpenseBreakdownMonth>();

  for (const row of rows) {
    const startDate = row.bookings?.start_date;
    if (yearOf(startDate) !== year) continue;

    const month = monthOf(startDate);
    let bucket = months.get(month);
    if (!bucket) {
      bucket = {
        month,
        daily_rent: 0,
        carwash: 0,
        extension_fee: 0,
        delivery_fee: 0,
        pickup_fee: 0,
        fuel: 0,
        driver_fee: 0,
        damage_fee: 0,
        agent_fee: 0,
        others: 0,
        total_gross: 0,
        total_net: 0,
      };
      months.set(month, bucket);
    }

    for (const field of EXPENSE_FEE_FIELDS) {
      bucket[field] += num(row[field as keyof PaymentRow]);
    }

    bucket.total_gross += num(row.total_gross);
    bucket.total_net += num(row.total_net);
  }

  const list = [...months.values()].sort((a, b) => a.month - b.month);

  const totals = list.reduce(
    (acc, row) => {
      for (const field of EXPENSE_FEE_FIELDS) {
        acc[field] += row[field];
      }
      acc.total_gross += row.total_gross;
      acc.total_net += row.total_net;
      return acc;
    },
    {
      month: 0,
      daily_rent: 0,
      carwash: 0,
      extension_fee: 0,
      delivery_fee: 0,
      pickup_fee: 0,
      fuel: 0,
      driver_fee: 0,
      damage_fee: 0,
      agent_fee: 0,
      others: 0,
      total_gross: 0,
      total_net: 0,
    } as Omit<ExpenseBreakdownMonth, "month">,
  );

  return { months: list, totals };
}

/* ------------------------------------------------------------------ */
/* Staff gross (staff/staff_gross.php)                                  */
/* ------------------------------------------------------------------ */

export type StaffGross = {
  totalGross: number;
  bookingsCount: number;
  avgPerBooking: number;
  months: { month: number; total: number }[];
  cars: {
    carId: number;
    brand: string | null;
    model: string | null;
    plateNumber: string | null;
    total: number;
    months: { month: number; gross: number }[];
  }[];
  recent: PaymentRow[];
  bestMonth: { month: number; total: number } | null;
  bestCar: { carId: number; brand: string | null; model: string | null; plateNumber: string | null; total: number } | null;
};

/**
 * Legacy `pages/staff/staff_gross.php`.
 *
 * Every number is derived from `booking_payments` where `settled_at` is set.
 */
export async function staffGross(
  session: AppSession,
  options: { year: number; period?: Period; bookingType?: string | null; carId?: number | null; limit?: number },
): Promise<StaffGross> {
  const rows = await listPayments(session, {
    year: options.year,
    dateField: "settled_at",
    period: options.period ?? "all",
    bookingType: options.bookingType,
    carId: options.carId,
  });

  const monthMap = new Map<number, number>();
  const carMap = new Map<
    number,
    {
      brand: string | null;
      model: string | null;
      plateNumber: string | null;
      total: number;
      months: Map<number, number>;
    }
  >();

  let totalGross = 0;

  for (const row of rows) {
    const gross = num(row.total_gross);
    totalGross += gross;

    const month = monthOf(row.settled_at);
    monthMap.set(month, (monthMap.get(month) ?? 0) + gross);

    const car = row.bookings?.cars;
    if (car) {
      let entry = carMap.get(car.id);
      if (!entry) {
        entry = {
          brand: car.brand,
          model: car.model,
          plateNumber: car.plate_number,
          total: 0,
          months: new Map(),
        };
        carMap.set(car.id, entry);
      }
      entry.total += gross;
      entry.months.set(month, (entry.months.get(month) ?? 0) + gross);
    }
  }

  const months = [...monthMap.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month - b.month);

  const cars = [...carMap.entries()]
    .map(([carId, entry]) => ({
      carId,
      brand: entry.brand,
      model: entry.model,
      plateNumber: entry.plateNumber,
      total: entry.total,
      months: [...entry.months.entries()]
        .map(([month, gross]) => ({ month, gross }))
        .sort((a, b) => a.month - b.month),
    }))
    .sort((a, b) => b.total - a.total);

  const bookingsCount = rows.length;

  const bestMonth = months.length
    ? months.reduce((best, item) => (item.total > best.total ? item : best))
    : null;

  const bestCar = cars.length ? cars[0] : null;

  return {
    totalGross,
    bookingsCount,
    avgPerBooking: bookingsCount ? totalGross / bookingsCount : 0,
    months,
    cars,
    recent: rows.slice(0, options.limit ?? 10),
    bestMonth,
    bestCar,
  };
}

/* ------------------------------------------------------------------ */
/* Staff revenue (staff/staff_revenue.php)                              */
/* ------------------------------------------------------------------ */

export type StaffRevenueCar = {
  carId: number;
  brand: string | null;
  model: string | null;
  plateNumber: string | null;
  months: { month: number; gross: number }[];
  total: number;
};

/**
 * Legacy `pages/staff/staff_revenue.php` — per car and month gross of the
 * `Completed` bookings of the staff member's branch.
 */
export async function staffRevenue(
  session: AppSession,
  year: number,
): Promise<{ cars: StaffRevenueCar[]; total: number }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const branch = branchFilter(session);

  // Legacy `staff_revenue.php` returns nothing when the staff member has no
  // branch (`if ($staff_branch_id > 0)`), and scopes on the CAR's branch.
  if (branch === null) {
    return { cars: [], total: 0 };
  }

  const branchCars = await fetchRows<{ id: number }>(
    supabase.from("cars").select("id").eq("branch_id", branch),
  );
  const branchCarIds = branchCars.map((car) => car.id);

  if (branchCarIds.length === 0) {
    return { cars: [], total: 0 };
  }

  const query = supabase
    .from("bookings")
    .select(
      `
      id, booking_type, status, branch_id, car_id, start_date, end_date, created_at, total_price,
      cars!bookings_car_id_fkey ( id, brand, model, plate_number ),
      booking_payments!booking_payments_booking_id_fkey ( total_gross, created_at )
    `,
    )
    .eq("status", "Completed")
    .in("car_id", branchCarIds)
    .order("id", { ascending: false });

  const bookings = await fetchRows<{
    id: number;
    car_id: number | null;
    created_at: string | null;
    total_price: number | null;
    cars: { id: number; brand: string | null; model: string | null; plate_number: string | null } | null;
    booking_payments: { total_gross: number | null; created_at: string | null }[] | null;
  }>(query);

  const carMap = new Map<
    number,
    {
      brand: string | null;
      model: string | null;
      plateNumber: string | null;
      months: Map<number, number>;
      total: number;
    }
  >();

  for (const booking of bookings) {
    const payment = booking.booking_payments?.[0] ?? null;
    const stamp = payment?.created_at ?? booking.created_at ?? null;
    if (yearOf(stamp) !== year) continue;

    const gross = payment ? num(payment.total_gross) : num(booking.total_price);
    const month = monthOf(stamp);

    const car = booking.cars;
    if (!car) continue;

    let entry = carMap.get(car.id);
    if (!entry) {
      entry = {
        brand: car.brand,
        model: car.model,
        plateNumber: car.plate_number,
        months: new Map(),
        total: 0,
      };
      carMap.set(car.id, entry);
    }

    entry.months.set(month, (entry.months.get(month) ?? 0) + gross);
    entry.total += gross;
  }

  const cars = [...carMap.entries()]
    .map(([carId, entry]) => ({
      carId,
      brand: entry.brand,
      model: entry.model,
      plateNumber: entry.plateNumber,
      months: [...entry.months.entries()]
        .map(([month, gross]) => ({ month, gross }))
        .sort((a, b) => a.month - b.month),
      total: entry.total,
    }))
    .sort((a, b) => {
      const brand = (a.brand ?? "").localeCompare(b.brand ?? "");
      if (brand !== 0) return brand;
      return (a.model ?? "").localeCompare(b.model ?? "");
    });

  return {
    cars,
    total: cars.reduce((acc, car) => acc + car.total, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Operator revenue (operator/revenue.php)                              */
/* ------------------------------------------------------------------ */

export type OperatorRevenueCar = {
  carId: number;
  brand: string | null;
  model: string | null;
  plateNumber: string | null;
  months: { month: number; gross: number; myShare: number }[];
  total: number;
  totalShare: number;
};

/**
 * Legacy `pages/operator/revenue.php`.
 *
 *   gross   = SUM(COALESCE(p.total_gross, b.total_price))
 *   myShare = SUM(COALESCE(p.total_net, b.total_price * 0.8))
 */
export async function operatorRevenue(
  session: AppSession,
  year: number,
  carId?: number | null,
): Promise<{ cars: OperatorRevenueCar[]; total: number; totalShare: number }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const { data: operatorCarsData } = await supabase
    .from("cars")
    .select("id")
    .eq("user_id", session.userId);

  const ownedCarIds = ((operatorCarsData ?? []) as { id: number }[]).map((row) => row.id);

  if (ownedCarIds.length === 0) {
    return { cars: [], total: 0, totalShare: 0 };
  }

  let query = supabase
    .from("bookings")
    .select(
      `
      id, status, car_id, created_at, total_price,
      cars!bookings_car_id_fkey ( id, brand, model, plate_number, user_id ),
      booking_payments!booking_payments_booking_id_fkey ( total_gross, total_net, created_at )
    `,
    )
    .eq("status", "Completed")
    .in("car_id", ownedCarIds)
    .order("id", { ascending: false });

  if (carId) {
    query = query.eq("car_id", carId);
  }

  const bookings = await fetchRows<{
    id: number;
    car_id: number | null;
    created_at: string | null;
    total_price: number | null;
    cars: { id: number; brand: string | null; model: string | null; plate_number: string | null } | null;
    booking_payments: { total_gross: number | null; total_net: number | null; created_at: string | null }[] | null;
  }>(query);

  const carMap = new Map<
    number,
    {
      brand: string | null;
      model: string | null;
      plateNumber: string | null;
      months: Map<number, { gross: number; myShare: number }>;
      total: number;
      totalShare: number;
    }
  >();

  for (const booking of bookings) {
    const stamp = booking.created_at ?? null;
    if (yearOf(stamp) !== year) continue;

    const payment = booking.booking_payments?.[0] ?? null;
    const gross = payment ? num(payment.total_gross) : num(booking.total_price);
    const myShare = payment
      ? num(payment.total_net)
      : num(booking.total_price) * 0.8;
    const month = monthOf(stamp);

    const car = booking.cars;
    if (!car) continue;

    let entry = carMap.get(car.id);
    if (!entry) {
      entry = {
        brand: car.brand,
        model: car.model,
        plateNumber: car.plate_number,
        months: new Map(),
        total: 0,
        totalShare: 0,
      };
      carMap.set(car.id, entry);
    }

    const bucket = entry.months.get(month) ?? { gross: 0, myShare: 0 };
    bucket.gross += gross;
    bucket.myShare += myShare;
    entry.months.set(month, bucket);
    entry.total += gross;
    entry.totalShare += myShare;
  }

  const cars = [...carMap.entries()]
    .map(([id, entry]) => ({
      carId: id,
      brand: entry.brand,
      model: entry.model,
      plateNumber: entry.plateNumber,
      months: [...entry.months.entries()]
        .map(([month, value]) => ({ month, gross: value.gross, myShare: value.myShare }))
        .sort((a, b) => a.month - b.month),
      total: entry.total,
      totalShare: entry.totalShare,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    cars,
    total: cars.reduce((acc, car) => acc + car.total, 0),
    totalShare: cars.reduce((acc, car) => acc + car.totalShare, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Settlements                                                          */
/* ------------------------------------------------------------------ */

export type PendingSettlement = {
  id: number;
  booking_type: string | null;
  branch_id: number | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
  total_price: number | null;
  extension_price: number | null;
  extension_hours: number | null;
  delivery_fee: number | null;
  pickup_fee: number | null;
  /** Car extension tiers, used by the legacy overtime auto-calculation. */
  ext_price_1_6: number | null;
  ext_price_7_10: number | null;
  ext_price_11_12: number | null;
  ext_price_13_24: number | null;
  remarks: string | null;
  guest_name: string | null;
  brand: string | null;
  model: string | null;
  plate_number: string | null;
  member_name: string | null;
};

/** Completed bookings that have no payment row yet (legacy `settlements.php`). */
export async function pendingSettlements(
  session: AppSession,
): Promise<PendingSettlement[]> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  let query = supabase
    .from("bookings")
    .select(
      `
      id, booking_type, branch_id, start_date, end_date, pickup_time, return_time,
      total_price, extension_price, extension_hours, delivery_fee, pickup_fee,
      remarks, guest_name, status,
      cars!bookings_car_id_fkey ( id, brand, model, plate_number, ext_price_1_6, ext_price_7_10, ext_price_11_12, ext_price_13_24 ),
      users!bookings_user_id_fkey ( id, name ),
      booking_payments!booking_payments_booking_id_fkey ( id )
    `,
    )
    .eq("status", "Completed")
    .order("id", { ascending: false });

  const branch = branchFilter(session);
  if (branch !== null) {
    query = query.eq("branch_id", branch);
  }

  const bookings = await fetchRows<{
    id: number;
    booking_type: string | null;
    branch_id: number | null;
    start_date: string | null;
    end_date: string | null;
    pickup_time: string | null;
    return_time: string | null;
    total_price: number | null;
    extension_price: number | null;
    extension_hours: number | null;
    delivery_fee: number | null;
    pickup_fee: number | null;
    remarks: string | null;
    guest_name: string | null;
    cars: {
      id: number;
      brand: string | null;
      model: string | null;
      plate_number: string | null;
      ext_price_1_6: number | null;
      ext_price_7_10: number | null;
      ext_price_11_12: number | null;
      ext_price_13_24: number | null;
    } | null;
    users: { id: number; name: string | null } | null;
    booking_payments: { id: number }[] | null;
  }>(query);

  return bookings
    .filter((booking) => (booking.booking_payments?.length ?? 0) === 0)
    .map((booking) => ({
      id: booking.id,
      booking_type: booking.booking_type,
      branch_id: booking.branch_id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      pickup_time: booking.pickup_time,
      return_time: booking.return_time,
      total_price: booking.total_price,
      extension_price: booking.extension_price,
      extension_hours: booking.extension_hours,
      delivery_fee: booking.delivery_fee,
      pickup_fee: booking.pickup_fee,
      ext_price_1_6: booking.cars?.ext_price_1_6 ?? null,
      ext_price_7_10: booking.cars?.ext_price_7_10 ?? null,
      ext_price_11_12: booking.cars?.ext_price_11_12 ?? null,
      ext_price_13_24: booking.cars?.ext_price_13_24 ?? null,
      remarks: booking.remarks,
      guest_name: booking.guest_name,
      brand: booking.cars?.brand ?? null,
      model: booking.cars?.model ?? null,
      plate_number: booking.cars?.plate_number ?? null,
      member_name: booking.users?.name ?? null,
    }));
}

/** The people that are allowed to settle a booking (legacy `settlers_sql`). */
export async function settlementSettlers(session: AppSession) {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const branch = branchFilter(session);

  let query = supabase
    .from("booking_payments")
    .select(
      `
      id, booking_id, settled_by,
      bookings!booking_payments_booking_id_fkey ( branch_id ),
      users!booking_payments_settled_by_fkey ( id, name, role )
    `,
    )
    .not("settled_by", "is", null);

  if (branch !== null) {
    query = query.eq("bookings.branch_id", branch);
  }

  const rows = await fetchRows<{
    id: number;
    settled_by: number | null;
    users: { id: number; name: string | null; role: string | null } | null;
  }>(query);

  const map = new Map<number, { id: number; name: string | null; role: string | null }>();

  for (const row of rows) {
    if (!row.users) continue;
    map.set(row.users.id, row.users);
  }

  return [...map.values()].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

/* ------------------------------------------------------------------ */
/* Staff fee remittances (admin/remittance.php)                         */
/* ------------------------------------------------------------------ */

export type StaffFeeBranch = {
  branchId: number;
  branchName: string;
  totalOwed: number;
  totalPaid: number;
  balance: number;
};

export type StaffFeeRemittance = {
  id: number;
  branch_id: number | null;
  amount: number | null;
  payment_date: string | null;
  notes: string | null;
  recorded_by: number | null;
  recorded_by_name: string | null;
  created_at: string | null;
  photos: { id: number; file_name: string }[];
};

/**
 * Legacy `pages/admin/remittance.php`.
 *
 *   totalOwed = SUM(jer_delivery_fee + jer_pickup_fee) of the branch bookings
 *   totalPaid = SUM(staff_fee_remittances.amount) of the branch
 */
export async function staffFeeRemittances(
  _session: AppSession,
): Promise<{ branches: StaffFeeBranch[]; rows: StaffFeeRemittance[] }> {
  // Admin-only screen: the legacy page shows every active branch. The session
  // parameter is kept so all finance helpers share the same signature.
  void _session;

  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const branches = await fetchRows<{
    id: number;
    name: string;
    is_active: boolean;
  }>(supabase.from("branches").select("id, name, is_active").eq("is_active", true).order("name", { ascending: true }));

  const payments = await fetchRows<{
    jer_delivery_fee: number | null;
    jer_pickup_fee: number | null;
    bookings: { branch_id: number | null } | null;
  }>(
    supabase.from("booking_payments").select("jer_delivery_fee, jer_pickup_fee, bookings!booking_payments_booking_id_fkey(branch_id)"),
  );

  const owedMap = new Map<number, number>();
  for (const payment of payments) {
    const branchId = payment.bookings?.branch_id;
    if (!branchId) continue;
    owedMap.set(
      branchId,
      (owedMap.get(branchId) ?? 0) + num(payment.jer_delivery_fee) + num(payment.jer_pickup_fee),
    );
  }

  const remittanceRows = await fetchRows<{
    id: number;
    branch_id: number | null;
    amount: number | null;
    payment_date: string | null;
    notes: string | null;
    recorded_by: number | null;
    created_at: string | null;
    users: { id: number; name: string | null } | null;
  }>(
    supabase
      .from("staff_fee_remittances")
      .select(
        "id, branch_id, amount, payment_date, notes, recorded_by, created_at, users!staff_fee_remittances_recorded_by_fkey(id, name)",
      )
      .order("payment_date", { ascending: false })
      .order("id", { ascending: false }),
  );

  const paidMap = new Map<number, number>();
  for (const row of remittanceRows) {
    if (!row.branch_id) continue;
    paidMap.set(row.branch_id, (paidMap.get(row.branch_id) ?? 0) + num(row.amount));
  }

  const photos = remittanceRows.length
    ? await fetchRows<{ id: number; remittance_id: number; file_name: string }>(
        supabase
          .from("staff_fee_remittance_photos")
          .select("id, remittance_id, file_name")
          .in(
            "remittance_id",
            remittanceRows.map((row) => row.id),
          )
          .order("id", { ascending: true }),
      )
    : [];

  const photosByRemittance = new Map<number, { id: number; file_name: string }[]>();
  for (const photo of photos) {
    const list = photosByRemittance.get(photo.remittance_id) ?? [];
    list.push({ id: photo.id, file_name: photo.file_name });
    photosByRemittance.set(photo.remittance_id, list);
  }

  return {
    branches: branches.map((branch) => {
      const totalOwed = owedMap.get(branch.id) ?? 0;
      const totalPaid = paidMap.get(branch.id) ?? 0;
      return {
        branchId: branch.id,
        branchName: branch.name,
        totalOwed,
        totalPaid,
        balance: totalOwed - totalPaid,
      };
    }),
    rows: remittanceRows.map((row) => ({
      id: row.id,
      branch_id: row.branch_id,
      amount: row.amount,
      payment_date: row.payment_date,
      notes: row.notes,
      recorded_by: row.recorded_by,
      recorded_by_name: row.users?.name ?? null,
      created_at: row.created_at,
      photos: photosByRemittance.get(row.id) ?? [],
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Operator remittances (admin/operator_revenue.php)                    */
/* ------------------------------------------------------------------ */

export type OperatorRemittanceCar = {
  carId: number;
  brand: string | null;
  model: string | null;
  plateNumber: string | null;
  branchId: number | null;
  branchName: string | null;
  operatorId: number | null;
  operatorName: string | null;
  totalOwed: number;
  totalPaid: number;
  balance: number;
  bookings: {
    booking_id: number;
    operator_share: number;
    settled_at: string | null;
    start_date: string | null;
    end_date: string | null;
    pickup_time: string | null;
    return_time: string | null;
    booking_type: string | null;
    booking_status: string | null;
  }[];
};

export type OperatorRemittanceRow = {
  id: number;
  operator_id: number | null;
  car_id: number | null;
  booking_id: number | null;
  amount: number | null;
  payment_date: string | null;
  notes: string | null;
  recorded_by: number | null;
  recorded_by_name: string | null;
  created_at: string | null;
  photos: { id: number; file_name: string }[];
};

/**
 * Legacy `pages/admin/operator_revenue.php`.
 *
 *   totalOwed = SUM(booking_payments.operator_share) of the car
 *   totalPaid = SUM(operator_remittances.amount) of the car
 */
export async function operatorRemittances(
  session: AppSession,
): Promise<{ cars: OperatorRemittanceCar[]; rows: OperatorRemittanceRow[] }> {
  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());

  const branch = branchFilter(session);

  let carQuery = supabase
    .from("cars")
    .select(
      `
      id, brand, model, plate_number, branch_id, user_id,
      users!cars_user_id_fkey ( id, name, role ),
      branches!cars_branch_id_fkey ( id, name )
    `,
    )
    .eq("users.role", "operator")
    .order("brand", { ascending: true });

  if (branch !== null) {
    carQuery = carQuery.eq("branch_id", branch);
  }

  const cars = await fetchRows<{
    id: number;
    brand: string | null;
    model: string | null;
    plate_number: string | null;
    branch_id: number | null;
    user_id: number | null;
    users: { id: number; name: string | null; role: string | null } | null;
    branches: { id: number; name: string } | null;
  }>(carQuery);

  const carIds = cars.map((car) => car.id);

  const [owedPayments, remittanceRows] = await Promise.all([
    carIds.length
      ? fetchRows<{
          booking_id: number;
          operator_share: number | null;
          created_at: string | null;
          bookings: {
            car_id: number | null;
            start_date: string | null;
            end_date: string | null;
            pickup_time: string | null;
            return_time: string | null;
            booking_type: string | null;
            status: string | null;
          } | null;
        }>(
          supabase
            .from("booking_payments")
            .select(
              "booking_id, operator_share, created_at, bookings!booking_payments_booking_id_fkey(car_id, start_date, end_date, pickup_time, return_time, booking_type, status)",
            )
            .in("bookings.car_id", carIds)
            .gt("operator_share", 0)
            .order("created_at", { ascending: false }),
        )
      : Promise.resolve([]),
    fetchRows<{
      id: number;
      operator_id: number | null;
      car_id: number | null;
      booking_id: number | null;
      amount: number | null;
      payment_date: string | null;
      notes: string | null;
      recorded_by: number | null;
      created_at: string | null;
      users: { id: number; name: string | null } | null;
    }>(
      supabase
        .from("operator_remittances")
        .select(
          "id, operator_id, car_id, booking_id, amount, payment_date, notes, recorded_by, created_at, users!operator_remittances_recorded_by_fkey(id, name)",
        )
        .order("payment_date", { ascending: false })
        .order("id", { ascending: false }),
    ),
  ]);

  const owedMap = new Map<number, number>();
  const bookingsMap = new Map<
    number,
    OperatorRemittanceCar["bookings"]
  >();

  for (const payment of owedPayments) {
    const carId = payment.bookings?.car_id;
    if (!carId) continue;

    owedMap.set(carId, (owedMap.get(carId) ?? 0) + num(payment.operator_share));

    const list = bookingsMap.get(carId) ?? [];
    list.push({
      booking_id: payment.booking_id,
      operator_share: num(payment.operator_share),
      settled_at: payment.created_at,
      start_date: payment.bookings?.start_date ?? null,
      end_date: payment.bookings?.end_date ?? null,
      pickup_time: payment.bookings?.pickup_time ?? null,
      return_time: payment.bookings?.return_time ?? null,
      booking_type: payment.bookings?.booking_type ?? null,
      booking_status: payment.bookings?.status ?? null,
    });
    bookingsMap.set(carId, list);
  }

  const paidMap = new Map<number, number>();
  for (const row of remittanceRows) {
    if (!row.car_id) continue;
    paidMap.set(row.car_id, (paidMap.get(row.car_id) ?? 0) + num(row.amount));
  }

  const photos = remittanceRows.length
    ? await fetchRows<{ id: number; remittance_id: number; file_name: string }>(
        supabase
          .from("operator_remittance_photos")
          .select("id, remittance_id, file_name")
          .in(
            "remittance_id",
            remittanceRows.map((row) => row.id),
          )
          .order("id", { ascending: true }),
      )
    : [];

  const photosByRemittance = new Map<number, { id: number; file_name: string }[]>();
  for (const photo of photos) {
    const list = photosByRemittance.get(photo.remittance_id) ?? [];
    list.push({ id: photo.id, file_name: photo.file_name });
    photosByRemittance.set(photo.remittance_id, list);
  }

  return {
    cars: cars.map((car) => {
      const totalOwed = owedMap.get(car.id) ?? 0;
      const totalPaid = paidMap.get(car.id) ?? 0;
      return {
        carId: car.id,
        brand: car.brand,
        model: car.model,
        plateNumber: car.plate_number,
        branchId: car.branch_id,
        branchName: car.branches?.name ?? null,
        operatorId: car.user_id,
        operatorName: car.users?.name ?? null,
        totalOwed,
        totalPaid,
        balance: totalOwed - totalPaid,
        bookings: bookingsMap.get(car.id) ?? [],
      };
    }),
    rows: remittanceRows.map((row) => ({
      id: row.id,
      operator_id: row.operator_id,
      car_id: row.car_id,
      booking_id: row.booking_id,
      amount: row.amount,
      payment_date: row.payment_date,
      notes: row.notes,
      recorded_by: row.recorded_by,
      recorded_by_name: row.users?.name ?? null,
      created_at: row.created_at,
      photos: photosByRemittance.get(row.id) ?? [],
    })),
  };
}
