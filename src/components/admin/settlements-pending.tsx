"use client";

import { useMemo, useState } from "react";
import { CircleCheck, RotateCcw, Search } from "lucide-react";
import Link from "next/link";

import { FormAutoSubmit } from "@/components/admin/auto-submit";
import { dateOnly } from "@/components/admin/finance-format";
import { SettlementDialog } from "@/components/admin/settlement-dialog";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/common/filter-bar";
import type { PendingSettlement } from "@/lib/data/finance";
import { cn } from "@/lib/utils";

/**
 * Pending settlement list — the Pending tab of
 * `car-rental/pages/admin/settlements.php`.
 */

function capitalise(value: string | null | undefined) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function customerName(booking: PendingSettlement) {
  return booking.guest_name || booking.member_name || "N/A";
}

function vehicleName(booking: PendingSettlement) {
  return [booking.brand, booking.model].filter(Boolean).join(" ") || "Vehicle";
}

function TypeBadge({ type }: { type: string | null }) {
  const manual = type === "manual";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-wide",
        manual
          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
          : "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
      )}
    >
      {capitalise(type)}
    </span>
  );
}

export function SettlementsPending({
  items,
  typeFilter,
  settledBy,
}: {
  items: PendingSettlement[];
  typeFilter: string;
  settledBy: number;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((booking) =>
      `${customerName(booking)} ${vehicleName(booking)} ${booking.plate_number ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  const columns: DataTableColumn<PendingSettlement>[] = [
    {
      key: "ended",
      header: "Trip Ended",
      cell: (booking) => (
        <>
          <p className="font-bold">{dateOnly(booking.end_date)}</p>
          <p className="text-xs text-muted-foreground">Finished Trip</p>
        </>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (booking) => (
        <p className="font-semibold">{customerName(booking)}</p>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (booking) => (
        <>
          <p className="font-bold">{vehicleName(booking)}</p>
          <p className="text-xs text-muted-foreground">
            {booking.plate_number ?? "—"}
          </p>
        </>
      ),
    },
    {
      key: "type",
      header: "Type",
      className: "text-center",
      cell: (booking) => (
        <div className="text-center">
          <TypeBadge type={booking.booking_type} />
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (booking) => (
        <div className="flex justify-end">
          <SettlementDialog booking={booking} settledBy={settledBy} />
        </div>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <FormAutoSubmit />

        <FilterField label="Type" className="max-w-[220px]">
          <select
            name="type"
            defaultValue={typeFilter}
            className={filterControlClass}
          >
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
              placeholder="Search customer, vehicle, or plate..."
              className={cn(filterControlClass, "pl-9")}
            />
          </div>
        </FilterField>

        <div className="flex min-w-[120px] flex-1 items-end">
          <Link
            href="/admin/settlements"
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" />
            Reset
          </Link>
        </div>
      </FilterBar>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={CircleCheck}
            title="All Settled!"
            description="No pending bookings require financial entry."
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Search}
            title="No pending settlements match your search"
            description="Try a different customer, vehicle, or plate."
          />
        </div>
      ) : (
        <>
          <div className="hidden xl:block">
            <DataTable
              columns={columns}
              rows={visible}
              keyExtractor={(booking) => String(booking.id)}
            />
          </div>

          <div className="flex flex-col gap-3 xl:hidden">
            {visible.map((booking) => (
              <div
                key={booking.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffd700] hover:shadow-[0_0_0_1px_#ffd700,0_6px_18px_-6px_rgba(255,215,0,0.5)]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                  <div className="min-w-0">
                    <p className="font-bold">{vehicleName(booking)}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.plate_number ?? "—"}
                    </p>
                  </div>
                  <TypeBadge type={booking.booking_type} />
                </div>

                <div className="space-y-2 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Customer</span>
                    <span className="font-semibold">{customerName(booking)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Trip Ended</span>
                    <span className="font-semibold">{dateOnly(booking.end_date)}</span>
                  </div>
                </div>

                <div className="border-t border-border bg-[#fffbe6] p-3 dark:bg-[#1a1600]">
                  <SettlementDialog
                    booking={booking}
                    settledBy={settledBy}
                    label="Enter Settlement Fees"
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
