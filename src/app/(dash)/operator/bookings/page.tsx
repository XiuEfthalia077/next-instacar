import {
  CalendarCheck,
  CalendarX,
  CarFront,
  CircleCheck,
  Inbox,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  TablePagination,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import {
  FilterBar,
  FilterField,
  FilterSubmitButton,
  FilterResetButton,
  filterControlClass,
} from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { PillTabs } from "@/components/common/pill-tabs";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { OperatorBookingActions } from "@/components/operator/operator-booking-actions";
import { getSupabase, requireRole } from "@/lib/auth";
import { operatorCars } from "@/lib/data/cars";
import { fetchRows, readPage, readPerPage } from "@/lib/data/scope";
import { formatDate } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

/**
 * Operator reservations — port of `car-rental/pages/operator/bookings.php`.
 *
 * Only `online` bookings of this operator's cars are shown. The KPI row is
 * always computed from every online booking of the fleet (legacy behaviour);
 * the table adds the status / date / search filters.
 */

const STATUS_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Released",
  "Completed",
  "Cancelled",
] as const;

type OperatorOnlineBooking = {
  id: number;
  booking_type: string | null;
  status: string;
  total_price: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  guest_name: string | null;
  gmail: string | null;
  phone_number: string | null;
  cars: {
    id: number;
    brand: string | null;
    model: string | null;
    plate_number: string | null;
    user_id: number | null;
  } | null;
  users: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

function normalizeFilter(value: string | undefined): string {
  return value && (STATUS_TABS as readonly string[]).includes(value)
    ? value
    : "All";
}

export const instant = false;

export default async function OperatorBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("operator");
  const params = await searchParams;
  const flash = readFlash(params);

  const filter = normalizeFilter(searchParam(params, "filter"));
  const search = searchParam(params, "search")?.trim() ?? "";
  const from = searchParam(params, "from") ?? "";
  const to = searchParam(params, "to") ?? "";
  const page = readPage(params.page);
  const perPage = readPerPage(params.perPage, 10);

  const cars = await operatorCars(session);
  const carIds = cars.map((car) => car.id);

  const supabase = await getSupabase();

  const bookings = carIds.length
    ? await fetchRows<OperatorOnlineBooking>(
        supabase
          .from("bookings")
          .select(
            `
            id, booking_type, status, total_price, start_date, end_date, created_at,
            guest_name, gmail, phone_number,
            cars!bookings_car_id_fkey ( id, brand, model, plate_number, user_id ),
            users!bookings_user_id_fkey ( id, name, email, phone )
          `,
          )
          .eq("booking_type", "online")
          .in("car_id", carIds)
          .order("created_at", { ascending: false }),
      )
    : [];

  /* ---------------- KPI row (all online bookings) ---------------- */
  const stats = {
    total: bookings.length,
    pending: bookings.filter((booking) => booking.status === "Pending").length,
    confirmed: bookings.filter((booking) => booking.status === "Confirmed").length,
    completed: bookings.filter((booking) => booking.status === "Completed").length,
    revenue: bookings.reduce(
      (sum, booking) => sum + Number(booking.total_price ?? 0),
      0,
    ),
  };

  /* ---------------- Table filters ---------------- */
  const term = search.toLowerCase();

  const filtered = bookings.filter((booking) => {
    if (filter !== "All" && booking.status !== filter) return false;

    if (from && booking.end_date && booking.end_date < from) return false;
    if (to && booking.start_date && booking.start_date > to) return false;

    if (!term) return true;

    const haystack = [
      `#bk-${booking.id}`,
      String(booking.id),
      booking.status,
      booking.users?.name,
      booking.users?.email,
      booking.guest_name,
      booking.gmail,
      booking.phone_number,
      booking.cars?.brand,
      booking.cars?.model,
      booking.cars?.plate_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const queryFor = (
    overrides: Record<string, string | number | undefined> = {},
  ) => {
    const query = new URLSearchParams();
    const values: Record<string, string | number | undefined> = {
      filter,
      search,
      from,
      to,
      perPage: perPage !== 10 ? perPage : undefined,
      ...overrides,
    };

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === "" || value === "All") continue;
      query.set(key, String(value));
    }

    return query.toString();
  };

  const tabHref = (value: string) => {
    const query = queryFor({ filter: value, page: undefined });
    return `/operator/bookings${query ? `?${query}` : ""}`;
  };

  const buildHref = (nextPage: number) => {
    const query = queryFor({ page: nextPage > 1 ? nextPage : undefined });
    return `/operator/bookings${query ? `?${query}` : ""}`;
  };

  const columns: DataTableColumn<OperatorOnlineBooking>[] = [
    {
      key: "booking",
      header: "Booking",
      cell: (booking) => (
        <Link
          href={`/shared/booking_details?id=${booking.id}`}
          className="font-bold text-foreground hover:text-[#b38a00] hover:underline"
        >
          #BK-{booking.id}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (booking) => (
        <div className="min-w-[150px]">
          <p className="font-bold text-foreground">
            {booking.users?.name ?? booking.guest_name ?? "Guest User"}
          </p>
          <Badge
            variant="outline"
            className="mt-1 border-border bg-muted/50 px-2 py-0 text-[9px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            {booking.booking_type ?? "online"}
          </Badge>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (booking) => (
        <div className="min-w-[140px]">
          <p className="font-semibold text-foreground">
            {[booking.cars?.brand, booking.cars?.model]
              .filter(Boolean)
              .join(" ") || "Vehicle"}
          </p>
          <code className="text-xs text-muted-foreground">
            {booking.cars?.plate_number ?? "\u2014"}
          </code>
        </div>
      ),
    },
    {
      key: "period",
      header: "Rental Period",
      cell: (booking) => (
        <div className="min-w-[150px] text-sm">
          <p className="font-medium text-foreground">
            {formatDate(booking.start_date, "datetime")}
          </p>
          <p className="text-xs text-muted-foreground">
            to {formatDate(booking.end_date, "datetime")}
          </p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      cell: (booking) => (
        <span className="font-bold text-foreground">
          <Money value={booking.total_price} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-right",
      cell: (booking) => (
        <div className="flex justify-end">
          <StatusBadge status={booking.status} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      cell: (booking) => (
        <OperatorBookingActions
          bookingId={booking.id}
          status={booking.status}
          filter={filter}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vehicle Reservations"
        subtitle="Online Bookings"
        description="Manage and track your fleet's reservation activity"
      />

      <Flash {...flash} />

      {/* Statistics Overview Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={stats.total}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          hint="Awaiting confirmation"
          icon={Inbox}
          tone="warning"
        />
        <StatCard
          label="Active / Done"
          value={stats.confirmed + stats.completed}
          hint={`${stats.confirmed} confirmed`}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Total Revenue"
          value={<Money value={stats.revenue} />}
          hint="From online"
          icon={Wallet}
          tone="success"
        />
      </div>

      {/* Status pills */}
      <PillTabs
        className="mb-3"
        tabs={STATUS_TABS.map((value) => ({
          label: value,
          href: tabHref(value),
          active: filter === value,
          count:
            value === "All"
              ? bookings.length
              : bookings.filter((booking) => booking.status === value).length,
        }))}
      />

      {/* Live control panel */}
      <FilterBar
        actions={
          <>
            <FilterSubmitButton>Search</FilterSubmitButton>
            <FilterResetButton href="/operator/bookings" />
          </>
        }
      >
        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search customer, vehicle, ID or status..."
            className={filterControlClass}
          />
        </FilterField>

        <FilterField label="From" className="max-w-[180px]">
          <input
            type="date"
            name="from"
            defaultValue={from}
            className={filterControlClass}
          />
        </FilterField>

        <FilterField label="To" className="max-w-[180px]">
          <input
            type="date"
            name="to"
            defaultValue={to}
            className={filterControlClass}
          />
        </FilterField>

        <FilterField label="Show entries" className="max-w-[130px]">
          <select
            name="perPage"
            defaultValue={String(perPage)}
            className={filterControlClass}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </FilterField>

        <input type="hidden" name="filter" value={filter} />
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={CalendarX}
            title="No Online Bookings Found"
            description={
              bookings.length === 0
                ? "There are no online bookings in the system yet."
                : `No ${filter === "All" ? "" : filter} bookings found for online reservations.`
            }
            action={
              <Link
                href="/operator/bookings?filter=All"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffcc00] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#ffd633]"
              >
                <CarFront className="size-3.5" />
                View All Bookings
              </Link>
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(booking) => String(booking.id)}
          footer={
            <TablePagination
              page={safePage}
              pageSize={perPage}
              total={filtered.length}
              buildHref={buildHref}
            />
          }
        />
      )}
    </>
  );
}
