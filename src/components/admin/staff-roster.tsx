"use client";

import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

import { filterControlClass } from "@/components/common/filter-bar";
import { cn } from "@/lib/utils";

/**
 * The Team Roster of `car-rental/pages/admin/staff_manager.php`.
 *
 * The legacy page filtered and sorted the rendered cards with plain JS; this
 * client component keeps that behaviour (search, status pills, sort select)
 * while the aggregate numbers are computed on the server.
 */

export type StaffRosterRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  initials: string;
  status: "active" | "idle" | "inactive";
  statusLabel: string;
  totalCreated: number;
  monthCreated: number;
  totalActions: number;
  monthActions: number;
  lastActivityTs: number;
  lastActivityLabel: string;
};

const STATUS_CLASSES: Record<StaffRosterRow["status"], string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  idle: "bg-slate-100 text-slate-500 dark:bg-[#1f1f23] dark:text-slate-400",
  inactive:
    "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

const PILLS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "idle", label: "Idle" },
  { value: "inactive", label: "Inactive" },
] as const;

export function StaffRoster({ rows }: { rows: StaffRosterRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState("name");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const matchesQuery =
        !needle ||
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.phone.toLowerCase().includes(needle);
      const matchesStatus = status === "all" || row.status === status;
      return matchesQuery && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "bookings") return b.totalCreated - a.totalCreated;
      if (sortBy === "actions") return b.totalActions - a.totalActions;
      if (sortBy === "recent") return b.lastActivityTs - a.lastActivityTs;
      return a.name.localeCompare(b.name);
    });
  }, [rows, query, status, sortBy]);

  return (
    <>
      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4">
        <div className="relative min-w-[200px] flex-[1_1_260px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, or phone..."
            className={cn(filterControlClass, "pl-9")}
          />
        </div>

        <div className="flex gap-1 rounded-[10px] border border-border bg-background p-1">
          {PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setStatus(pill.value)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                status === pill.value
                  ? "bg-[#ffcc00] text-black shadow-[0_3px_8px_rgba(255,204,0,0.3)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className={cn(filterControlClass, "min-w-[160px] flex-1 font-semibold")}
        >
          <option value="name">Name A→Z</option>
          <option value="bookings">Most Bookings</option>
          <option value="actions">Most Actions</option>
          <option value="recent">Recently Active</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          <Search className="mx-auto mb-2 size-6 opacity-30" />
          No staff members match your filters.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((row) => (
            <div
              key={row.id}
              className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-[#ffcc00] hover:shadow-[0_12px_20px_-8px_rgba(255,204,0,0.25)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ffcc00] to-[#ffe066] text-lg font-extrabold text-black shadow-[0_4px_12px_rgba(255,204,0,0.3)]">
                  {row.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[1.05rem] font-extrabold leading-tight text-foreground">
                    {row.name}
                  </h3>
                  <p className="truncate text-[0.78rem] text-muted-foreground">
                    {row.email}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[0.68rem] font-bold",
                      STATUS_CLASSES[row.status],
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {row.statusLabel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 border-t border-border pt-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                    Bookings Created
                  </span>
                  <span className="text-[1.15rem] font-extrabold leading-none text-foreground">
                    {row.totalCreated.toLocaleString("en-PH")}
                  </span>
                  <span
                    className={cn(
                      "text-[0.68rem] font-semibold text-muted-foreground",
                      row.monthCreated > 0 && "font-bold text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {row.monthCreated.toLocaleString("en-PH")} this month
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                    Actions Taken
                  </span>
                  <span className="text-[1.15rem] font-extrabold leading-none text-foreground">
                    {row.totalActions.toLocaleString("en-PH")}
                  </span>
                  <span
                    className={cn(
                      "text-[0.68rem] font-semibold text-muted-foreground",
                      row.monthActions > 0 && "font-bold text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {row.monthActions.toLocaleString("en-PH")} this month
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                <span className="text-muted-foreground">
                  <Clock className="mr-1 inline size-3.5 align-[-2px]" />
                  Last activity
                </span>
                <span className="font-bold text-foreground">
                  {row.lastActivityLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
