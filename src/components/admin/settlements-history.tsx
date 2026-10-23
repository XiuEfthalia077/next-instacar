"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CircleHelp,
  CircleX,
  IdCard,
  Search,
  ShieldCheck,
  Store,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

import { FormAutoSubmit } from "@/components/admin/auto-submit";
import {
  dateOnly,
  manilaClock,
  peso,
  relativeTime,
} from "@/components/admin/finance-format";
import { ResetSettlementButton } from "@/components/admin/reset-settlement-button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/common/filter-bar";
import { cn } from "@/lib/utils";

/**
 * Settlement history — the History tab of
 * `car-rental/pages/admin/settlements.php`.
 *
 * Period / settler / type are server-side filters (GET params), exactly like
 * the legacy page. The search box stays client-side and filters the rendered
 * rows / mobile cards.
 */

export type SettlementHistoryItem = {
  paymentId: number;
  bookingId: number;
  gross: number;
  net: number;
  settledAt: string | null;
  settlerName: string | null;
  settlerRole: string | null;
  bookingType: string | null;
  brand: string | null;
  model: string | null;
  plateNumber: string | null;
  customerName: string | null;
};

export type SettlerOption = {
  id: number;
  name: string | null;
  role: string | null;
};

type HistoryPeriod = "all" | "today" | "7d" | "30d";

const PERIODS: { key: HistoryPeriod; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

function capitalise(value: string | null | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function vehicleName(item: SettlementHistoryItem) {
  return [item.brand, item.model].filter(Boolean).join(" ") || "Vehicle";
}

function TypeBadge({ type }: { type: string | null }) {
  const manual = type === "manual";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.66rem] font-extrabold uppercase tracking-wide",
        manual
          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
          : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
      )}
    >
      {capitalise(type) || "—"}
    </span>
  );
}

const ROLE_STYLE: Record<
  string,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  admin: {
    className: "bg-[#ffd700] text-black",
    icon: ShieldCheck,
  },
  staff: {
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    icon: IdCard,
  },
  operator: {
    className:
      "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
    icon: Briefcase,
  },
};

function AuditBadge({ name, role }: { name: string | null; role: string | null }) {
  const key = (role ?? "").toLowerCase();
  const style = ROLE_STYLE[key] ?? {
    className:
      "bg-muted text-muted-foreground italic dark:bg-muted/60",
    icon: CircleHelp,
  };
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-xs font-bold",
        style.className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{name || "Unknown User"}</span>
      {key ? (
        <span className="hidden shrink-0 whitespace-nowrap text-[0.68rem] font-semibold opacity-70 sm:inline">
          · {capitalise(key)}
        </span>
      ) : null}
    </span>
  );
}

export function SettlementsHistory({
  items,
  settlers,
  historyScope,
  hPeriod,
  hSettler,
  hType,
  typeFilter,
  branchLabel,
}: {
  items: SettlementHistoryItem[];
  settlers: SettlerOption[];
  historyScope: "branch" | "mine";
  hPeriod: HistoryPeriod;
  hSettler: number;
  hType: string;
  typeFilter: string;
  branchLabel: string;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((item) =>
      [
        item.customerName ?? "",
        item.brand ?? "",
        item.model ?? "",
        item.plateNumber ?? "",
        item.settlerName ?? "",
        item.settlerRole ?? "",
        item.bookingType ?? "",
        dateOnly(item.settledAt),
        String(item.gross),
        String(item.net),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  const typeQuery = typeFilter !== "all" ? `&type=${typeFilter}` : "";

  const scopeHref = (scope: "branch" | "mine") =>
    `/admin/settlements?tab=history&history_scope=${scope}${typeQuery}#history-pane`;

  const periodHref = (period: HistoryPeriod) => {
    const query = new URLSearchParams({
      tab: "history",
      history_scope: historyScope,
      h_period: period,
    });

    if (hSettler > 0) query.set("h_settler", String(hSettler));
    if (hType !== "all") query.set("h_type", hType);
    if (typeFilter !== "all") query.set("type", typeFilter);

    return `/admin/settlements?${query.toString()}#history-pane`;
  };

  const clearHref = `/admin/settlements?tab=history&history_scope=${historyScope}${typeQuery}#history-pane`;

  const columns: DataTableColumn<SettlementHistoryItem>[] = [
    {
      key: "settled",
      header: "Settled",
      cell: (item) => (
        <>
          <p className="text-sm font-semibold">{dateOnly(item.settledAt)}</p>
          <p className="text-xs text-muted-foreground">
            {manilaClock(item.settledAt)}
            {item.settledAt ? ` · ${relativeTime(item.settledAt)}` : ""}
          </p>
        </>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (item) => (
        <>
          <p className="font-bold">{vehicleName(item)}</p>
          <p className="text-xs text-muted-foreground">
            {item.plateNumber ?? "—"}
          </p>
        </>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (item) => (
        <>
          <p className="text-sm font-semibold">
            {item.customerName || "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">
            {capitalise(item.bookingType) || "—"}
          </p>
        </>
      ),
    },
    {
      key: "settler",
      header: "Settled By",
      cell: (item) => (
        <AuditBadge name={item.settlerName} role={item.settlerRole} />
      ),
    },
    {
      key: "gross",
      header: "Gross",
      numeric: true,
      cell: (item) => <span className="font-semibold">{peso(item.gross)}</span>,
    },
    {
      key: "net",
      header: "Net",
      numeric: true,
      cell: (item) => (
        <span className="font-bold text-emerald-700 dark:text-emerald-400">
          {peso(item.net)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end">
          <ResetSettlementButton
            bookingId={item.bookingId}
            label={`${vehicleName(item)}${item.plateNumber ? ` (${item.plateNumber})` : ""}`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Scope */}
      <div
        id="history-pane"
        className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm"
      >
        <span className="px-2 text-xs text-muted-foreground">Show:</span>
        <Link
          href={scopeHref("branch")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors",
            historyScope === "branch"
              ? "bg-[#ffcc00] font-bold text-black"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Store className="size-4" />
          {branchLabel}
        </Link>
        <Link
          href={scopeHref("mine")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors",
            historyScope === "mine"
              ? "bg-[#ffcc00] font-bold text-black"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <UserRoundCheck className="size-4" />
          My Settlements Only
        </Link>
      </div>

      {/* Filters */}
      <FilterBar>
        <FormAutoSubmit />
        <input type="hidden" name="tab" value="history" />
        <input type="hidden" name="history_scope" value={historyScope} />
        {typeFilter !== "all" ? (
          <input type="hidden" name="type" value={typeFilter} />
        ) : null}

        <FilterField label="Period" className="min-w-[240px] flex-[1.5]">
          <div className="flex flex-wrap gap-1 rounded-[10px] border border-border bg-muted/40 p-1">
            {PERIODS.map((period) => (
              <Link
                key={period.key}
                href={periodHref(period.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  hPeriod === period.key
                    ? "bg-[#ffcc00] font-bold text-black"
                    : "text-muted-foreground hover:bg-card hover:text-foreground",
                )}
              >
                {period.label}
              </Link>
            ))}
          </div>
        </FilterField>

        <FilterField label="Settled By" className="max-w-[260px]">
          <select
            name="h_settler"
            defaultValue={String(hSettler)}
            className={filterControlClass}
          >
            <option value="0">Anyone</option>
            {settlers.map((settler) => (
              <option key={settler.id} value={settler.id}>
                {settler.name ?? "Unknown"}
                {settler.role ? ` (${capitalise(settler.role)})` : ""}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Type" className="max-w-[200px]">
          <select name="h_type" defaultValue={hType} className={filterControlClass}>
            <option value="all">All Types</option>
            <option value="online">Online</option>
            <option value="manual">Manual</option>
          </select>
        </FilterField>

        <FilterField label="Search" className="min-w-[240px] flex-[2]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder="Customer, vehicle, or plate..."
              className={cn(filterControlClass, "pl-9")}
            />
          </div>
        </FilterField>

        <div className="flex min-w-[110px] flex-1 items-end">
          <Link
            href={clearHref}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <CircleX className="size-4" />
            Clear
          </Link>
        </div>
      </FilterBar>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Search}
            title="No settlement history yet"
            description={
              historyScope === "mine"
                ? "You haven't settled any bookings yet."
                : "No settled bookings found for this branch."
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Search}
            title="No settlement history matches your search"
            description="Try a different customer, vehicle, plate, or settler."
          />
        </div>
      ) : (
        <>
          <div className="hidden xl:block">
            <DataTable
              columns={columns}
              rows={visible}
              keyExtractor={(item) => String(item.paymentId)}
            />
          </div>

          <div className="flex flex-col gap-3 xl:hidden">
            {visible.map((item) => (
              <div
                key={item.paymentId}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffd700] hover:shadow-[0_0_0_1px_#ffd700,0_6px_18px_-6px_rgba(255,215,0,0.5)]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                  <div className="min-w-0">
                    <p className="font-bold">{vehicleName(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.plateNumber ?? "—"}
                    </p>
                  </div>
                  <AuditBadge name={item.settlerName} role={item.settlerRole} />
                </div>

                <div className="space-y-2 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Customer</span>
                    <span className="font-semibold">
                      {item.customerName || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Settled</span>
                    <span className="text-right font-semibold">
                      {dateOnly(item.settledAt)} {manilaClock(item.settledAt)}
                      <span className="block text-[0.7rem] font-medium text-muted-foreground">
                        {relativeTime(item.settledAt)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <TypeBadge type={item.bookingType} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Gross</span>
                    <span className="font-semibold">{peso(item.gross)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                    <span className="font-bold">Net</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {peso(item.net)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border bg-muted/30 p-3">
                  <ResetSettlementButton
                    bookingId={item.bookingId}
                    label={`${vehicleName(item)}${item.plateNumber ? ` (${item.plateNumber})` : ""}`}
                    fullWidth
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
