import { Clock, Hourglass, Receipt } from "lucide-react";

import { SettlementsHistory } from "@/components/admin/settlements-history";
import type { SettlementHistoryItem } from "@/components/admin/settlements-history";
import { SettlementsPending } from "@/components/admin/settlements-pending";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { PillTabs } from "@/components/common/pill-tabs";
import { StatCard } from "@/components/common/stat-card";
import { requireRole } from "@/lib/auth";
import { listBranches } from "@/lib/data/cars";
import {
  listPayments,
  num,
  pendingSettlements,
  settlementSettlers,
} from "@/lib/data/finance";
import { formatDate, manilaNowTimestamp, manilaToday, wallClockTimestamp } from "@/lib/datetime";
import { connection } from "next/server";
import { readFlash, searchParam } from "@/lib/flash";

/**
 * Pending Settlements — port of `car-rental/pages/admin/settlements.php`.
 *
 * The legacy screen had two Bootstrap tab panes (Pending / History). They are
 * reproduced with URL-driven tabs so both panes stay server-rendered:
 *
 *   /admin/settlements                      -> Pending
 *   /admin/settlements?tab=history&...      -> History
 *
 * The pending list is filtered by `?type=`; the history pane keeps the legacy
 * scope / period / settler / type filters. Search stays client-side.
 */

type BookingTypeFilter = "all" | "online" | "manual";

const HISTORY_PERIOD_VALUES = ["all", "today", "7d", "30d"] as const;
type HistoryPeriod = (typeof HISTORY_PERIOD_VALUES)[number];

function bookingTypeFilter(value: string | undefined): BookingTypeFilter {
  return value === "online" || value === "manual" ? value : "all";
}

function historyScope(value: string | undefined): "branch" | "mine" {
  return value === "mine" ? "mine" : "branch";
}

function historyPeriod(value: string | undefined): HistoryPeriod {
  return HISTORY_PERIOD_VALUES.includes(value as HistoryPeriod)
    ? (value as HistoryPeriod)
    : "all";
}

function historyType(value: string | undefined): BookingTypeFilter {
  return value === "online" || value === "manual" ? value : "all";
}

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function withinHistoryPeriod(
  value: string | null | undefined,
  period: HistoryPeriod,
): boolean {
  if (period === "all") return true;
  if (!value) return false;

  if (period === "today") {
    return formatDate(value, "iso") === manilaToday();
  }

  const days = period === "7d" ? 7 : 30;
  const stamp = timestamp(value);
  return stamp > 0 && Date.now() - stamp <= days * 86_400_000;
}

function oldestLabel(value: string | null): string {
  if (!value) return "—";

  const end = wallClockTimestamp(value);
  if (!Number.isFinite(end) || end <= 0) return "—";

  const days = Math.floor((manilaNowTimestamp() - end) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export const instant = false;

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const typeFilter = bookingTypeFilter(searchParam(params, "type"));
  const hScope = historyScope(searchParam(params, "history_scope"));
  const hPeriod = historyPeriod(searchParam(params, "h_period"));
  const hSettler = Number.parseInt(searchParam(params, "h_settler") ?? "0", 10) || 0;
  const hType = historyType(searchParam(params, "h_type"));

  // The legacy page opened the History pane whenever a history filter was in
  // the URL; the new tab links also pass `?tab=history`.
  const onHistory =
    searchParam(params, "tab") === "history" ||
    ["history_scope", "h_period", "h_settler", "h_type"].some(
      (key) => searchParam(params, key) !== undefined,
    );

  const [allPending, settlers, branches, payments] = await Promise.all([
    pendingSettlements(session),
    settlementSettlers(session),
    listBranches(),
    listPayments(session, { dateField: "settled_at" }),
  ]);

  const branchLabel =
    session.viewBranch === "all"
      ? "All Branches"
      : (branches.find((branch) => branch.id === session.viewBranch)?.name ??
        "Selected Branch");

  // ── Pending settlements ──────────────────────────────────────────────
  // Legacy filters by booking type in SQL and orders by `end_date DESC`.
  const pending = allPending
    .filter(
      (booking) =>
        typeFilter === "all" || booking.booking_type === typeFilter,
    )
    .sort((a, b) => timestamp(b.end_date) - timestamp(a.end_date));

  const pendingCount = pending.length;
  const pendingValue = pending.reduce(
    (sum, booking) => sum + num(booking.total_price),
    0,
  );

  const oldestEndDate = pending.reduce<string | null>((oldest, booking) => {
    if (!booking.end_date) return oldest;
    if (!oldest) return booking.end_date;
    return booking.end_date < oldest ? booking.end_date : oldest;
  }, null);

  // ── History ──────────────────────────────────────────────────────────
  const history: SettlementHistoryItem[] = payments
    .filter((payment) => {
      if (hScope === "mine" && payment.settled_by !== session.userId) return false;
      if (hSettler > 0 && payment.settled_by !== hSettler) return false;

      const booking = payment.bookings;
      if (hType !== "all" && booking?.booking_type !== hType) return false;

      return withinHistoryPeriod(payment.settled_at, hPeriod);
    })
    .sort(
      (a, b) =>
        timestamp(b.settled_at) - timestamp(a.settled_at) || b.id - a.id,
    )
    .slice(0, 100)
    .map((payment) => {
      const booking = payment.bookings;

      return {
        paymentId: payment.id,
        bookingId: payment.booking_id,
        gross: num(payment.total_gross),
        net: num(payment.total_net),
        settledAt: payment.settled_at,
        settlerName: payment.users?.name ?? null,
        settlerRole: payment.users?.role ?? null,
        bookingType: booking?.booking_type ?? null,
        brand: booking?.cars?.brand ?? null,
        model: booking?.cars?.model ?? null,
        plateNumber: booking?.cars?.plate_number ?? null,
        customerName: booking?.guest_name || booking?.users?.name || null,
      };
    });

  // ── Tabs ─────────────────────────────────────────────────────────────
  const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";

  const pendingHref =
    typeFilter !== "all" ? `/admin/settlements?type=${typeFilter}` : "/admin/settlements";

  const historyHref = `/admin/settlements?tab=history&history_scope=${hScope}${typeParam}`;

  return (
    <>
      <PageHeader
        title="Pending Settlements"
        subtitle={branchLabel}
        description="Completed bookings awaiting fee entry."
      />

      <Flash {...flash} />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pending Count"
          value={pendingCount.toLocaleString("en-PH")}
          hint="Bookings awaiting settlement"
          icon={Hourglass}
          tone="primary"
        />
        <StatCard
          label="Total Pending Value"
          value={<Money value={pendingValue} />}
          hint="Estimated revenue"
          icon={Receipt}
        />
        <StatCard
          label="Oldest Pending"
          value={oldestLabel(oldestEndDate)}
          hint="Age of oldest unsettled trip"
          icon={Clock}
          tone={pendingCount > 0 ? "warning" : "success"}
        />
      </div>

      <PillTabs
        className="mb-4"
        tabs={[
          {
            label: "Pending",
            href: pendingHref,
            active: !onHistory,
            count: pendingCount > 0 ? pendingCount : undefined,
          },
          {
            label: "History",
            href: historyHref,
            active: onHistory,
            count: history.length > 0 ? history.length : undefined,
          },
        ]}
      />

      {onHistory ? (
        <SettlementsHistory
          key={`${hScope}:${hPeriod}:${hSettler}:${hType}`}
          items={history}
          settlers={settlers}
          historyScope={hScope}
          hPeriod={hPeriod}
          hSettler={hSettler}
          hType={hType}
          typeFilter={typeFilter}
          branchLabel={branchLabel}
        />
      ) : (
        <SettlementsPending
          key={typeFilter}
          items={pending}
          typeFilter={typeFilter}
          settledBy={session.userId}
        />
      )}
    </>
  );
}
