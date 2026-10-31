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
  User,
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

type AuditUser = {
  id: number;
  name: string | null;
  role: string | null;
};

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

const ACTION_ICONS: Record<string, typeof Clock> = {
  Confirmed: CircleCheck,
  Completed: CarFront,
  Cancelled: CircleX,
  Edited: Clock,
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

export const instant = false;

export default async function StaffBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  // Legacy auto-cancel cleaner (branch-scoped), runs before the counters.
  await autoCancelStaleBookings(session);

  const filter = normalizeFilter(searchParam(params, "filter"));
  const status = filter === "All" ? undefined : filter;
  const search = searchParam(params, "search")?.trim() || undefined;
  const from = searchParam(params, "from") || undefined;
  const to = searchParam(params, "to") || undefined;
  const page = readPage(params.page);
  const perPage = readPerPage(params.perPage, 10);

  const supabase = await getSupabase();
  const scopedBranch = branchFilter(session);

  let counterQuery = supabase
    .from("bookings")
    .select("status")
    .eq("booking_type", "online");

  if (scopedBranch !== null) {
    counterQuery = counterQuery.eq("branch_id", scopedBranch);
  }

  const [{ rows, count }, statusRows, actionItems] = await Promise.all([
    listBookings(session, {
      status,
      bookingType: "online",
      search,
      from,
      to,
      page,
      perPage,
    }),
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
    completed: counts.get("Completed") ?? 0,
  };

  const documents = await Promise.all(rows.map((row) => documentsFor(supabase, row)));

  const auditIds = [
    ...new Set(
      rows
        .map((booking) => booking.last_action_by)
        .filter((id): id is number => id != null),
    ),
  ];

  const auditRows = auditIds.length
    ? await fetchRows<AuditUser>(
        supabase.from("users").select("id, name, role").in("id", auditIds),
      )
    : [];
  const auditUsers = new Map(auditRows.map((user) => [user.id, user]));

  const queryFor = (overrides: Record<string, string | number | undefined> = {}) => {
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
    const query = queryFor({ filter: value });
    return `/staff/bookings${query ? `?${query}` : ""}`;
  };

  const buildHref = (nextPage: number) => {
    const query = queryFor({ page: nextPage > 1 ? nextPage : undefined });
    return `/staff/bookings${query ? `?${query}` : ""}`;
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
      key: "audit",
      header: "Audit",
      cell: (booking) => {
        const actor = booking.last_action_by
          ? auditUsers.get(booking.last_action_by)
          : undefined;
        const actionType = booking.last_action_type ?? "Edited";
        const Icon = ACTION_ICONS[actionType] ?? Clock;
        const tone =
          ACTION_TONES[actionType] ??
          "border-border bg-muted text-muted-foreground";

        return (
          <div className="flex min-w-[190px] flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold italic text-muted-foreground">
              <User className="size-3" />
              Auto / Customer
            </span>
            {actor?.name ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}
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
        const address = isDelivery
          ? booking.delivery_address || "No address provided"
          : "Jibao-an, Pavia, Iloilo";

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
      header: "Pricing",
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
      className: "text-end",
      cell: (booking, index) => (
        <div className="flex justify-end">
          <OnlineBookingActions
            booking={booking}
            filter={filter}
            documents={documents[index]}
          />
        </div>
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

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Online" value={totals.all} icon={Globe2} tone="primary" />
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
        <StatCard
          label="Completed"
          value={totals.completed}
          icon={CircleCheck}
          tone="success"
        />
      </div>

      <PillTabs
        className="mb-4"
        tabs={[
          { label: "All Bookings", href: tabHref("All"), active: filter === "All", count: totals.all },
          { label: "Pending", href: tabHref("Pending"), active: filter === "Pending", count: totals.pending },
          { label: "Confirmed", href: tabHref("Confirmed"), active: filter === "Confirmed", count: totals.confirmed },
          { label: "Completed", href: tabHref("Completed"), active: filter === "Completed", count: totals.completed },
          { label: "Cancelled", href: tabHref("Cancelled"), active: filter === "Cancelled" },
        ]}
      />

      <FilterBar
        className="mb-4"
        actions={
          <>
            <FilterSubmitButton />
            <FilterResetButton href="/staff/bookings" />
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
            description="Try adjusting the filters above."
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
