"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, Phone, Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { dateOnly, initials } from "@/components/staff/finance-format";
import { cn } from "@/lib/utils";

/** Shape returned by the zero-argument `customer_directory()` RPC. */
export type CustomerDirectoryRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  total_bookings: number | string | null;
  completed_bookings: number | string | null;
  cancelled_bookings: number | string | null;
  active_bookings: number | string | null;
  last_branch_name: string | null;
};

const LIMITS = ["5", "10", "25", "50", "999"] as const;

function count(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function CountBadge({
  tone,
  children,
}: {
  tone: "total" | "active" | "completed" | "cancelled" | "zero";
  children: React.ReactNode;
}) {
  const tones = {
    total: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    active: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    completed:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    zero: "bg-slate-50 italic text-slate-400 dark:bg-slate-900 dark:text-slate-500",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.7rem] font-bold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function BookingBadges({ customer }: { customer: CustomerDirectoryRow }) {
  const total = count(customer.total_bookings);
  const active = count(customer.active_bookings);
  const completed = count(customer.completed_bookings);
  const cancelled = count(customer.cancelled_bookings);

  return (
    <div className="flex flex-wrap gap-1">
      <CountBadge tone="total">{total} total</CountBadge>
      {active > 0 ? <CountBadge tone="active">{active} active</CountBadge> : null}
      {completed > 0 ? (
        <CountBadge tone="completed">{completed} completed</CountBadge>
      ) : null}
      {cancelled > 0 ? (
        <CountBadge tone="cancelled">{cancelled} cancelled</CountBadge>
      ) : null}
      {total === 0 ? <CountBadge tone="zero">No bookings yet</CountBadge> : null}
    </div>
  );
}

function CopyButton({ value, title }: { value: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const finish = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    };

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        finish();
        return;
      } catch {
        // Fall through to the legacy textarea fallback.
      }
    }

    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();

    try {
      document.execCommand("copy");
      finish();
    } catch {
      // Clipboard access can be blocked entirely; ignore like the PHP page.
    }

    document.body.removeChild(area);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={title}
      className={cn(
        "ml-1.5 inline-flex size-5 items-center justify-center rounded border transition-colors",
        copied
          ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "border-border text-muted-foreground hover:border-[#ffcc00] hover:bg-[#ffcc00]/12 hover:text-[#b38a00] dark:hover:text-[#ffd700]",
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

function CustomerIdentity({ customer }: { customer: CustomerDirectoryRow }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffcc00]/12 text-[0.85rem] font-extrabold uppercase text-[#8a6a00] dark:text-[#ffd700]">
        {initials(customer.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-bold text-foreground">
          {customer.name || "Unnamed customer"}
        </p>
        <p className="text-xs text-muted-foreground">Customer #{customer.id}</p>
      </div>
    </div>
  );
}

export function CustomerDirectory({
  customers,
}: {
  customers: CustomerDirectoryRow[];
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("10");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const max = Number.parseInt(limit, 10) || 10;

    const matches = needle
      ? customers.filter((customer) =>
          `${customer.name ?? ""} ${customer.email ?? ""} ${customer.phone ?? ""}`
            .toLowerCase()
            .includes(needle),
        )
      : customers;

    return matches.slice(0, max);
  }, [customers, limit, query]);

  const columns: DataTableColumn<CustomerDirectoryRow>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (customer) => <CustomerIdentity customer={customer} />,
    },
    {
      key: "contact",
      header: "Contact",
      cell: (customer) => (
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center">
            <Mail className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-foreground">{customer.email || "—"}</span>
            {customer.email ? (
              <CopyButton value={customer.email} title="Copy email" />
            ) : null}
          </div>
          <div className="flex items-center">
            <Phone className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-foreground">{customer.phone || "—"}</span>
            {customer.phone ? (
              <CopyButton value={customer.phone} title="Copy phone" />
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "history",
      header: "Booking History",
      cell: (customer) => <BookingBadges customer={customer} />,
    },
    {
      key: "branch",
      header: "Last Booked At",
      cell: (customer) =>
        customer.last_branch_name ? (
          <CountBadge tone="total">{customer.last_branch_name}</CountBadge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "joined",
      header: "Joined",
      className: "text-right",
      cell: (customer) => (
        <span className="text-sm text-muted-foreground">
          {dateOnly(customer.created_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      {customers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Search}
            title="No customers yet"
            description="Customer accounts will appear here once they register."
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span>Show</span>
              <select
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                aria-label="Entries per page"
                className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-[#ffcc00] focus:ring-3 focus:ring-[#ffcc00]/25"
              >
                {LIMITS.map((value) => (
                  <option key={value} value={value}>
                    {value === "999" ? "All" : value}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="relative w-full max-w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, phone..."
                className="h-10 w-full rounded-[10px] border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-[#ffcc00] focus:ring-3 focus:ring-[#ffcc00]/25"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <EmptyState
                icon={Search}
                title="No customers match your search"
                description="Try a different name, email, or phone number."
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <DataTable
                  columns={columns}
                  rows={visible}
                  keyExtractor={(customer) => String(customer.id)}
                />
              </div>

              <div className="flex flex-col gap-4 lg:hidden">
                {visible.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffcc00]/12 text-[0.85rem] font-extrabold uppercase text-[#8a6a00] dark:text-[#ffd700]">
                        {initials(customer.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-foreground">
                          {customer.name || "Unnamed customer"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Joined {dateOnly(customer.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="size-3.5" /> Email
                        </span>
                        <span className="max-w-[65%] truncate text-right text-[0.8rem] text-foreground">
                          {customer.email || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="size-3.5" /> Phone
                        </span>
                        <span className="text-[0.8rem] text-foreground">
                          {customer.phone || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Last Booked At</span>
                        <span className="text-[0.8rem] text-foreground">
                          {customer.last_branch_name || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 border-t border-border pt-2">
                      <BookingBadges customer={customer} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
