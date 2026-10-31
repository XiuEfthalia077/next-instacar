import {
  Banknote,
  CalendarCheck,
  CarFront,
  Coins,
  KeyRound,
  PlusCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { getSupabase, requireRole } from "@/lib/auth";
import { operatorCars, type CarWithOwner } from "@/lib/data/cars";
import { monthOf, num, yearOf } from "@/lib/data/finance";
import { fetchCount, fetchRows } from "@/lib/data/scope";
import { readFlash } from "@/lib/flash";
import { cn } from "@/lib/utils";

/**
 * Operator dashboard — port of `car-rental/pages/operator/dashboard.php`.
 *
 * The welcome banner, the six KPI tiles and the "My Vehicles" table keep the
 * same order and copy as the legacy page. Every figure is scoped to the cars
 * owned by the signed-in operator (`cars.user_id`).
 */

const CAR_STATUS_STYLES: Record<string, string> = {
  Available:
    "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  Rented:
    "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  Active:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  Maintenance:
    "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
};

type OperatorPayment = {
  total_net: number | null;
  owner_balance: number | null;
  created_at: string | null;
};

export const instant = false;

export default async function OperatorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("operator");
  const params = await searchParams;
  const flash = readFlash(params);

  const cars = await operatorCars(session);
  const carIds = cars.map((car) => car.id);

  const supabase = await getSupabase();

  const [payments, totalBookings] = await Promise.all([
    carIds.length
      ? fetchRows<OperatorPayment>(
          supabase
            .from("booking_payments")
            .select(
              "total_net, owner_balance, created_at, bookings!booking_payments_booking_id_fkey(car_id)",
            )
            .in("bookings.car_id", carIds),
        )
      : Promise.resolve([] as OperatorPayment[]),
    carIds.length
      ? fetchCount(
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .in("car_id", carIds),
        )
      : Promise.resolve(0),
  ]);

  const nowIso = new Date().toISOString();
  const currentMonth = monthOf(nowIso);
  const currentYear = yearOf(nowIso);

  const monthlyEarnings = payments
    .filter(
      (payment) =>
        monthOf(payment.created_at) === currentMonth &&
        yearOf(payment.created_at) === currentYear,
    )
    .reduce((sum, payment) => sum + num(payment.total_net), 0);

  const totalEarnings = payments.reduce(
    (sum, payment) => sum + num(payment.total_net),
    0,
  );

  const pendingRemittance = payments.reduce(
    (sum, payment) => sum + num(payment.owner_balance),
    0,
  );

  const availableCars = cars.filter((car) => car.status === "Available").length;
  const activeRentals = cars.filter((car) => car.status === "Active").length;
  const recentCars = cars.slice(0, 5);

  const monthYear = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());

  const columns: DataTableColumn<CarWithOwner>[] = [
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (car) => (
        <span className="font-semibold text-foreground">
          {[car.brand, car.model].filter(Boolean).join(" ") || "Vehicle"}
        </span>
      ),
    },
    {
      key: "plate",
      header: "Plate Number",
      cell: (car) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
          {car.plate_number ?? "\u2014"}
        </code>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      cell: (car) => (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-3 py-0.5 text-[11px] font-bold",
              CAR_STATUS_STYLES[car.status] ??
                "border-border bg-muted text-muted-foreground",
            )}
          >
            {car.status}
          </Badge>
        </div>
      ),
    },
    {
      key: "rate",
      header: "Daily Rate",
      numeric: true,
      cell: (car) => (
        <span className="font-bold text-foreground">
          <Money value={car.price_24_hours} />
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (car) => (
        <Link
          href={`/operator/view_car?id=${car.id}`}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Operator Dashboard"
        subtitle="My Fleet"
        description="Track performance, manage listings, and monitor fleet earnings."
      />

      <Flash {...flash} />

      {/* Welcome banner */}
      <section className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold md:text-2xl">
              Welcome back,{" "}
              <span className="text-[#ffcc00]">{session.name || "Operator"}</span>
              ! 👋
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75 md:text-base">
              Track performance, manage listings, and monitor fleet earnings for{" "}
              {monthYear}.
            </p>
            <Link
              href="/shared/cars"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-6 py-2.5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#ffd633] hover:shadow-[0_4px_15px_rgba(255,204,0,0.4)]"
            >
              <PlusCircle className="size-4" />
              Manage Fleet
            </Link>
          </div>
          <CarFront className="hidden size-32 shrink-0 text-white/15 md:block" />
        </div>
      </section>

      {/* Stat cards */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="My Fleet"
          value={cars.length}
          hint={`${availableCars} available`}
          icon={CarFront}
          tone="primary"
        />
        <StatCard
          label="Active Trips"
          value={activeRentals}
          hint="In progress"
          icon={KeyRound}
          tone="success"
        />
        <StatCard
          label="Bookings"
          value={totalBookings}
          hint="All time records"
          icon={CalendarCheck}
          tone="info"
        />
        <StatCard
          label="Pending Bal"
          value={<Money value={pendingRemittance} />}
          hint="To collect"
          icon={Wallet}
          tone="warning"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Monthly Net"
          value={<Money value={monthlyEarnings} />}
          hint={monthYear}
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Total Net"
          value={<Money value={totalEarnings} />}
          hint="Gross overall"
          icon={Coins}
          tone="success"
        />
      </div>

      {/* Vehicles */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <CarFront className="size-4 text-[#b38a00]" />
          My Vehicles
        </h2>
        <Link
          href="/shared/cars"
          className="text-xs font-semibold text-[#b38a00] hover:underline"
        >
          Manage Fleet &rarr;
        </Link>
      </div>

      <SectionCard>
        {recentCars.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title="No vehicles found. Add your first car to get started."
            className="py-12"
          />
        ) : (
          <DataTable
            columns={columns}
            rows={recentCars}
            keyExtractor={(car) => String(car.id)}
            emptyMessage="No vehicles found. Add your first car to get started."
          />
        )}
      </SectionCard>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
        <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Banknote className="size-4 text-[#b38a00]" />
          Pending balance is collected from settled bookings.
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <CarFront className="size-4 text-[#b38a00]" />
          Only the five most recent vehicles are listed here.
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <CalendarCheck className="size-4 text-[#b38a00]" />
          All booking records count toward the Bookings tile.
        </span>
      </div>
    </>
  );
}
