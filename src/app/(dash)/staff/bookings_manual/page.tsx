import {
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  Inbox,
  MapPin,
  Pencil,
  PlusCircle,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { ManualBookingActions } from "@/components/admin/manual-booking-actions";
import { ManualBookingDialog } from "@/components/admin/manual-booking-dialog";
import {
  DocumentPreviewButton,
  type BookingDocument,
} from "@/components/admin/document-preview";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  DataTable,
  TablePagination,
  type DataTableColumn,
} from "@/components/common/data-table";
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
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { BookingAttentionBadge } from "@/components/common/booking-attention-badge";
import { ActionCheckCard } from "@/components/dashboard/action-check-card";
import { getSupabase, requireRole } from "@/lib/auth";
import { listBookings, actionCheckManualList, type BookingRow } from "@/lib/data/bookings";
import { listBranches, listCars } from "@/lib/data/cars";
import { branchFilter, fetchRows, readPage, readPerPage } from "@/lib/data/scope";
import { formatDate, manilaToday } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { BUCKETS, signedFileUrls } from "@/lib/storage";
import { cn } from "@/lib/utils";

const STATUS_TABS = ["All", "Confirmed", "Completed", "Cancelled"] as const;

type AuditUser = {
  id: number;
  name: string | null;
  role: string | null;
};

type BusyBooking = {
  car_id: number | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
};

function normalizeFilter(value: string | undefined): string {
  return value && (STATUS_TABS as readonly string[]).includes(value) ? value : "All";
}

function clock(value: string | null | undefined) {
  if (!value) return "\u2014";
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const value = `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
  return value || "?";
}

function relativeTime(value: string | null | undefined) {
  if (!value) return "";
  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "";

  const diff = Math.floor((Date.now() - stamp) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`;

  return new Date(stamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

function isPdf(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

async function documentsFor(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  booking: BookingRow,
): Promise<BookingDocument[]> {
  const entries = [
    { key: "primary", label: "ID 1", path: booking.primary_id_path },
    { key: "secondary", label: "ID 2", path: booking.secondary_id_path },
    { key: "billing", label: "BILLING", path: booking.proof_billing_path },
  ].filter((entry) => Boolean(entry.path));

  if (!entries.length) return [];

  const urls = await signedFileUrls(
    supabase,
    BUCKETS.bookingUploads,
    entries.map((entry) => entry.path ?? ""),
  );

  return entries.map((entry, index) => ({
    key: entry.key,
    label: entry.label,
    url: urls[index] ?? "",
    isPdf: isPdf(entry.path ?? ""),
  }));
}

const ACTION_TONES: Record<string, string> = {
  Confirmed:
    "border-sky-200 bg-sky-100 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  Completed:
    "border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  Cancelled:
    "border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  Edited:
    "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
};

const ACTION_ICONS = {
  Confirmed: CircleCheck,
  Completed: CircleCheck,
  Cancelled: CircleX,
  Edited: Pencil,
} as const;

export const instant = false;
export const maxDuration = 60;

export default async function StaffBookingsManualPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  const filter = normalizeFilter(searchParam(params, "filter"));
  const status = filter === "All" ? undefined : filter;
  const search = searchParam(params, "search")?.trim() || undefined;
  const from = searchParam(params, "from") || undefined;
  const to = searchParam(params, "to") || undefined;
  const mine = searchParam(params, "mine") === "1";
  const page = readPage(params.page);
  const perPage = readPerPage(params.perPage, 10);

  const supabase = await getSupabase();
  const scopedBranch = branchFilter(session);

  let counterQuery = supabase
    .from("bookings")
    .select("status")
    .eq("booking_type", "manual");

  if (scopedBranch !== null) {
    counterQuery = counterQuery.eq("branch_id", scopedBranch);
  }
  if (mine) {
    counterQuery = counterQuery.eq("created_by", session.userId);
  }

  let carQuery = supabase
    .from("cars")
    .select(
      "id, branch_id, brand, model, plate_number, type, price_10_hours, price_12_hours, price_24_hours, ext_price_1_6, ext_price_7_10, ext_price_11_12, ext_price_13_24",
    )
    .order("brand", { ascending: true });

  if (scopedBranch !== null) {
    carQuery = carQuery.eq("branch_id", scopedBranch);
  }

  const [{ rows, count }, branches, statusRows, customers, carRows, actionItems] = await Promise.all([
    listBookings(session, {
      status,
      bookingType: "manual",
      search,
      from,
      to,
      page,
      perPage,
    }),
    listBranches(),
    fetchRows<{ status: string }>(counterQuery),
    fetchRows<{ id: number; name: string | null; email?: string | null }>(
      supabase.from("users").select("id, name, email").eq("role", "user").order("name", { ascending: true }),
    ),
    fetchRows<{
      id: number;
      branch_id: number | null;
      brand: string | null;
      model: string | null;
      plate_number: string | null;
      type: string | null;
      price_10_hours: number | null;
      price_12_hours: number | null;
      price_24_hours: number | null;
      ext_price_1_6: number | null;
      ext_price_7_10: number | null;
      ext_price_11_12: number | null;
      ext_price_13_24: number | null;
    }>(carQuery),
    actionCheckManualList(session, 50),
  ]);

  const todayStr = manilaToday();

  let filteredRows = rows;
  if (mine) {
    filteredRows = rows.filter((row) => row.created_by === session.userId);
  }

  const carIds = carRows.map((car) => car.id);
  const busyRows = carIds.length
    ? await fetchRows<BusyBooking>(
        supabase
          .from("bookings")
          .select("car_id, start_date, end_date, pickup_time, return_time")
          .in("car_id", carIds)
          .not("status", "in", "(Cancelled,Completed)"),
      )
    : [];

  const busyByCar = new Map<number, { start: string; end: string }[]>();
  for (const busy of busyRows) {
    if (busy.car_id == null || !busy.start_date || !busy.end_date) continue;
    const list = busyByCar.get(busy.car_id) ?? [];
    list.push({
      start: `${busy.start_date}T${busy.pickup_time ?? "00:00:00"}`,
      end: `${busy.end_date}T${busy.return_time ?? "23:59:59"}`,
    });
    busyByCar.set(busy.car_id, list);
  }

  const cars = carRows.map((car) => ({
    ...car,
    busySlots: busyByCar.get(car.id) ?? [],
  }));

  const customersForDialog = customers.map((customer) => ({
    id: customer.id,
    name: customer.name ?? "Unnamed customer",
    email: customer.email ?? null,
  }));

  const auditIds = [
    ...new Set(
      filteredRows.flatMap((booking) =>
        [booking.created_by, booking.last_action_by].filter(
          (id): id is number => id != null,
        ),
      ),
    ),
  ];

  const auditRows = auditIds.length
    ? await fetchRows<AuditUser>(
        supabase.from("users").select("id, name, role").in("id", auditIds),
      )
    : [];

  const auditUsers = new Map(auditRows.map((user) => [user.id, user]));

  const documents = await Promise.all(filteredRows.map((row) => documentsFor(supabase, row)));

  const counts = new Map<string, number>();
  for (const row of statusRows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  const totals = {
    all: statusRows.length,
    confirmed: counts.get("Confirmed") ?? 0,
    completed: counts.get("Completed") ?? 0,
    cancelled: counts.get("Cancelled") ?? 0,
  };

  const queryFor = (overrides: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    const values: Record<string, string | number | undefined> = {
      filter,
      search,
      from,
      to,
      mine: mine ? 1 : undefined,
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
    const query = queryFor({ filter: value });
    return `/staff/bookings_manual${query ? `?${query}` : ""}`;
  };

  const buildHref = (nextPage: number) => {
    const query = queryFor({ page: nextPage > 1 ? nextPage : undefined });
    return `/staff/bookings_manual${query ? `?${query}` : ""}`;
  };

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const columns: DataTableColumn<BookingRow>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (booking) => {
        const name = booking.guest_name || booking.users?.name || "N/A";
        const isGuest = Boolean(booking.guest_name);
        return (
          <div className="flex min-w-[190px] items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-muted-foreground">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                <p className="font-bold text-foreground">{name}</p>
                {isGuest ? (
                  <Badge
                    variant="outline"
                    className="border-border bg-secondary px-1.5 py-0 text-[9px] font-bold text-secondary-foreground"
                  >
                    WALK-IN
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {booking.gmail || booking.users?.email || "No Email"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "audit",
      header: "Audit",
      cell: (booking) => {
        const creator = booking.created_by
          ? auditUsers.get(booking.created_by)
          : undefined;
        const actor = booking.last_action_by
          ? auditUsers.get(booking.last_action_by)
          : undefined;

        const actionType = booking.last_action_type ?? "Edited";
        const Icon =
          ACTION_ICONS[actionType as keyof typeof ACTION_ICONS] ?? Clock;
        const tone =
          ACTION_TONES[actionType] ??
          "border-border bg-muted text-muted-foreground";

        const isMine = creator?.id === session.userId;

        return (
          <div className="flex min-w-[190px] flex-col items-start gap-1">
            {creator?.name ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
                By {isMine ? "You" : creator.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold italic text-muted-foreground">
                Auto / Customer
              </span>
            )}

            {actor?.name ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                  tone,
                )}
              >
                <Icon className="size-3" />
                {actionType} &bull; {actor.name}
                <span className="font-medium opacity-70">
                  {relativeTime(booking.last_action_at)}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold italic text-muted-foreground">
                <Clock className="size-3" />
                No actions yet
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (booking) => (
        <div className="min-w-[140px]">
          <p className="font-semibold text-foreground">
            {[booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "\u2014"}
          </p>
          <p className="text-xs text-muted-foreground">
            {booking.cars?.plate_number ?? "No plate"}
          </p>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (booking) => (
        <div className="min-w-[150px] text-sm">
          <p className="font-medium text-foreground">
            {formatDate(booking.start_date)} &ndash; {formatDate(booking.end_date)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {clock(booking.pickup_time)} &ndash; {clock(booking.return_time)}
          </p>
        </div>
      ),
    },
    {
      key: "fulfillment",
      header: "Fulfillment",
      cell: (booking) => {
        const isDelivery = (booking.fulfillment_type ?? "Pickup").toLowerCase() === "delivery";
        const branch =
          branchMap.get(booking.branch_id ?? 0) ??
          branchMap.get(booking.cars?.branch_id ?? 0);
        const address = isDelivery
          ? booking.delivery_address || "No address provided"
          : (booking.delivery_address || `${branch?.name ?? "Main Branch"} - ${branch?.address ?? "Branch Location"}`);

        return (
          <div className="min-w-[190px]">
            <Badge
              variant="outline"
              className={
                isDelivery
                  ? "gap-1 border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                  : "gap-1 border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground"
              }
            >
              {isDelivery ? <Truck className="size-3" /> : <Store className="size-3" />}
              {isDelivery ? "Delivery" : "Pickup"}
            </Badge>
            <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 size-3 shrink-0 text-rose-500" />
              <span>{address}</span>
            </p>
          </div>
        );
      },
    },
    {
      key: "files",
      header: "Verification Files",
      cell: (_booking, index) => {
        const files = documents[index].filter(
          (document) => document.key === "primary" || document.key === "billing",
        );

        return (
          <div className="flex min-w-[110px] flex-wrap gap-1">
            {files.length ? (
              files.map((document) => (
                <DocumentPreviewButton
                  key={document.key}
                  document={document}
                  compact
                />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">&mdash;</span>
            )}
          </div>
        );
      },
    },
    {
      key: "pricing",
      header: "Pricing",
      cell: (booking) => {
        const base = Number(booking.total_price ?? 0);
        const total =
          base + Number(booking.discount_price ?? 0) + Number(booking.down_payment ?? 0);
        return (
          <div className="min-w-[130px]">
            <Money value={total} className="block font-bold text-foreground" />
            <span className="block text-[11px] font-bold text-[#b38a00] dark:text-[#ffd700]">
              Bal: <Money value={base} />
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      cell: (booking) => (
        <div className="flex flex-col items-center justify-center gap-1.5">
          <StatusBadge status={booking.status} />
          <BookingAttentionBadge booking={booking} />
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      className: "text-end",
      cell: (booking, index) => (
        <div className="flex justify-end">
          <ManualBookingActions
            booking={booking}
            filter={filter}
            documents={documents[index]}
            customers={customersForDialog}
            cars={cars}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Manual Bookings"
        description="Create and manage walk-in reservations."
        actions={
          <ManualBookingDialog customers={customersForDialog} cars={cars} />
        }
      />

      <Flash {...flash} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Walk-ins"
          value={totals.all}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          label="Confirmed"
          value={totals.confirmed}
          icon={CircleCheck}
          tone="info"
        />
        <StatCard
          label="Completed"
          value={totals.completed}
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Cancelled"
          value={totals.cancelled}
          icon={CircleX}
          tone="danger"
        />
      </div>

      {/* Walk-in Action Check: Urgent today & warning tomorrow */}
      <ActionCheckCard
        title="Walk-In Action Check"
        description="Urgent walk-in actions requiring attention today and upcoming warnings for tomorrow."
        items={actionItems}
        compact
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PillTabs
          tabs={[
            { label: "All Bookings", href: tabHref("All"), active: filter === "All", count: totals.all },
            { label: "Confirmed", href: tabHref("Confirmed"), active: filter === "Confirmed", count: totals.confirmed },
            { label: "Completed", href: tabHref("Completed"), active: filter === "Completed", count: totals.completed },
            { label: "Cancelled", href: tabHref("Cancelled"), active: filter === "Cancelled", count: totals.cancelled },
          ]}
        />
        <Link
          href={mine ? `/staff/bookings_manual${queryFor({ mine: undefined }) ? `?${queryFor({ mine: undefined })}` : ""}` : `/staff/bookings_manual${queryFor({ mine: 1 }) ? `?${queryFor({ mine: 1 })}` : ""}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 text-[13px] font-semibold transition-colors",
            mine
              ? "border-[#ffcc00] bg-[#ffcc00] text-black"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <PlusCircle className="size-4" />
          Mine Only
        </Link>
      </div>

      <FilterBar
        className="mb-4"
        actions={
          <>
            <FilterSubmitButton />
            <FilterResetButton href="/staff/bookings_manual" />
          </>
        }
      >
        <input type="hidden" name="filter" value={filter} />
        {mine ? <input type="hidden" name="mine" value="1" /> : null}
        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <input
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search reservations..."
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="From">
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="To">
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Entries" className="max-w-[130px] flex-none">
          <select name="perPage" defaultValue={String(perPage)} className={filterControlClass}>
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {filteredRows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Inbox}
            title="No manual bookings found."
            description="Create a walk-in booking or adjust the filters above."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard bodyClassName="p-0">
            <DataTable
              columns={columns}
              rows={filteredRows}
              keyExtractor={(booking) => String(booking.id)}
              emptyMessage="No manual bookings found."
            />
          </SectionCard>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            <TablePagination
              page={page}
              pageSize={perPage}
              total={mine ? filteredRows.length : count}
              buildHref={buildHref}
            />
          </div>
        </>
      )}
    </>
  );
}
