import {
  CalendarCheck,
  CarFront,
  CircleCheck,
  CircleX,
  Clock,
  Globe2,
  Inbox,
  MapPin,
  Truck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { OnlineBookingActions } from "@/components/admin/online-booking-actions";
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
import { requireRole, getSupabase } from "@/lib/auth";
import { autoCancelStaleBookings, listBookings, actionCheckOnlineList, type BookingRow } from "@/lib/data/bookings";
import { listBranches } from "@/lib/data/cars";
import { branchFilter, fetchRows, readPage, readPerPage } from "@/lib/data/scope";
import { formatDate } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { BUCKETS, signedFileUrls } from "@/lib/storage";

const STATUS_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Released",
  "Completed",
  "Cancelled",
] as const;

function normalizeFilter(value: string | undefined): string {
  return value && (STATUS_TABS as readonly string[]).includes(value) ? value : "All";
}

/** `HH:MM:SS` -> `h:mm A` (legacy `date('h:i A')`). */
function clock(value: string | null | undefined) {
  if (!value) return "\u2014";
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
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
    { key: "payment", label: "PAYMENT", path: booking.proof_payment_path },
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

/**
 * Online Reservations — port of `car-rental/pages/admin/bookings_online.php`.
 *
 * The legacy page auto-cancelled stale Pending online bookings while loading.
 * That write does not exist as a read-safe data helper, so it is intentionally
 * not reproduced here (see TODOs in the porting notes).
 */
export const instant = false;

export default async function AdminBookingsOnlinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  // Legacy auto-cancel cleaner (runs before the counters and the list).
  await autoCancelStaleBookings(session);

  const filter = normalizeFilter(searchParam(params, "filter"));
  const status = filter === "All" ? undefined : filter;
  const search = searchParam(params, "search")?.trim() || undefined;
  const from = searchParam(params, "from") || undefined;
  const to = searchParam(params, "to") || undefined;
  const branchId = Number.parseInt(searchParam(params, "branch") ?? "0", 10) || undefined;
  const page = readPage(params.page);
  const perPage = readPerPage(params.perPage, 10);

  const supabase = await getSupabase();

  let counterQuery = supabase
    .from("bookings")
    .select("status")
    .eq("booking_type", "online");

  const scopedBranch = branchFilter(session);
  if (scopedBranch !== null) counterQuery = counterQuery.eq("branch_id", scopedBranch);
  if (branchId) counterQuery = counterQuery.eq("branch_id", branchId);

  const [{ rows, count }, branches, statusRows, actionItems] = await Promise.all([
    listBookings(session, {
      status,
      bookingType: "online",
      search,
      branchId,
      from,
      to,
      page,
      perPage,
    }),
    listBranches(),
    fetchRows<{ status: string }>(counterQuery),
    actionCheckOnlineList(session, 50),
  ]);

  const counts = new Map<string, number>();
  for (const row of statusRows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  const totals = {
    all: statusRows.length,
    pending: counts.get("Pending") ?? 0,
    confirmed: counts.get("Confirmed") ?? 0,
    released: counts.get("Released") ?? 0,
    completed: counts.get("Completed") ?? 0,
    cancelled: counts.get("Cancelled") ?? 0,
  };

  const documents = await Promise.all(rows.map((row) => documentsFor(supabase, row)));

  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));

  const queryFor = (overrides: Record<string, string | number | undefined> = {}) => {
    const query = new URLSearchParams();
    const values: Record<string, string | number | undefined> = {
      filter,
      search,
      from,
      to,
      branch: branchId,
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
    return `/admin/bookings_online${query ? `?${query}` : ""}`;
  };

  const buildHref = (nextPage: number) => {
    const query = queryFor({ page: nextPage > 1 ? nextPage : undefined });
    return `/admin/bookings_online${query ? `?${query}` : ""}`;
  };

  const columns: DataTableColumn<BookingRow>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (booking) => {
        const name = booking.users?.name ?? booking.guest_name ?? "Guest User";
        const email = booking.users?.email ?? booking.gmail ?? "No Email";
        return (
          <div className="min-w-[170px]">
            <p className="font-bold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Badge
              variant="outline"
              className="mt-1 border-border bg-muted/50 px-2 py-0 text-[10px] font-bold text-muted-foreground"
            >
              #BK-{booking.id}
            </Badge>
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
          <Badge
            variant="outline"
            className="mt-1 border-border bg-muted/40 px-2 py-0 text-[11px] font-semibold text-muted-foreground"
          >
            {booking.cars?.plate_number ?? "No plate"}
          </Badge>
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
          : `${branch?.name ?? "Main Branch"} - ${branch?.address ?? "Branch Location"}`;

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
      header: "Files",
      cell: (_booking, index) => (
        <div className="flex max-w-[180px] flex-wrap gap-1">
          {documents[index].length ? (
            documents[index].map((document) => (
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
      ),
    },
    {
      key: "pricing",
      header: "Pricing Data",
      cell: (booking) => {
        const total = Number(booking.total_price ?? 0);
        const down = Number(booking.down_payment ?? 0);
        return (
          <div className="min-w-[130px]">
            <Money value={total} className="block font-bold text-foreground" />
            {down > 0 ? (
              <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                DP: <Money value={down} />
              </span>
            ) : null}
            <span className="block text-[11px] font-bold text-[#b38a00] dark:text-[#ffd700]">
              Bal: <Money value={Math.max(0, total - down)} />
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
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
      cell: (booking, index) => (
        <OnlineBookingActions
          booking={booking}
          filter={filter}
          documents={documents[index]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Online Reservations"
        description="Manage your online booking pipeline efficiently."
      />

      <Flash {...flash} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
        <StatCard label="Total" value={totals.all} icon={Globe2} tone="primary" />
        <ActionCheckCard
          title="Online Action Check"
          description="Urgent online reservation actions requiring attention today and upcoming warnings for tomorrow."
          items={actionItems}
        />
        <StatCard label="Pending" value={totals.pending} icon={Clock} tone="warning" />
        <StatCard
          label="Confirmed"
          value={totals.confirmed}
          icon={CalendarCheck}
          tone="info"
        />
        <StatCard label="Released" value={totals.released} icon={CarFront} tone="default" />
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

      <PillTabs
        className="mb-4"
        tabs={[
          { label: "All Bookings", href: tabHref("All"), active: filter === "All", count: totals.all },
          { label: "Pending", href: tabHref("Pending"), active: filter === "Pending", count: totals.pending },
          { label: "Confirmed", href: tabHref("Confirmed"), active: filter === "Confirmed", count: totals.confirmed },
          { label: "Released", href: tabHref("Released"), active: filter === "Released", count: totals.released },
          { label: "Completed", href: tabHref("Completed"), active: filter === "Completed", count: totals.completed },
          { label: "Cancelled", href: tabHref("Cancelled"), active: filter === "Cancelled", count: totals.cancelled },
        ]}
      />

      <FilterBar
        className="mb-4"
        actions={
          <>
            <FilterSubmitButton />
            <FilterResetButton href="/admin/bookings_online" />
          </>
        }
      >
        <input type="hidden" name="filter" value={filter} />
        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <input
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search reservations..."
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Branch">
          <select name="branch" defaultValue={branchId ? String(branchId) : ""} className={filterControlClass}>
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
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

      {rows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Inbox}
            title="No online bookings found."
            description="Try a different status, branch or date range."
          />
        </SectionCard>
      ) : (
        <>
          <SectionCard bodyClassName="p-0">
            <DataTable
              columns={columns}
              rows={rows}
              keyExtractor={(booking) => String(booking.id)}
              emptyMessage="No online bookings found."
            />
          </SectionCard>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            <TablePagination
              page={page}
              pageSize={perPage}
              total={count}
              buildHref={buildHref}
            />
          </div>
        </>
      )}
    </>
  );
}
