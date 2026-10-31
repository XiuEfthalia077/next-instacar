import {
  CalendarDays,
  Mail,
  Phone,
  Search,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { requireRole } from "@/lib/auth";
import { customerDirectory, listUsers } from "@/lib/data/users";
import { formatDate } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function StaffCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);
  const search = searchParam(params, "search");

  // Fetch customers via customerDirectory RPC or users table fallback
  let directory = await customerDirectory(session, search);

  if (directory.length === 0 && !search) {
    const { rows } = await listUsers(session, { role: "user", perPage: 100 });
    directory = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      total_bookings: 0,
      active_bookings: 0,
      total_spent: 0,
      last_booking: null,
    }));
  }

  const totalCustomers = directory.length;
  const activeCustomers = directory.filter((c) => c.active_bookings > 0).length;
  const returningCustomers = directory.filter((c) => c.total_bookings > 1).length;

  return (
    <>
      <PageHeader
        title="Customer Directory"
        subtitle="Customer Relations"
        description="View customer profiles, rental frequency, and booking activity for your branch."
      />

      <Flash {...flash} />

      {/* KPI Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Customers"
          value={totalCustomers}
          hint="Registered users"
          icon={Users}
        />
        <StatCard
          label="Active Renters"
          value={activeCustomers}
          hint="Currently on trip"
          icon={UserCheck}
          tone="primary"
        />
        <StatCard
          label="Returning Renters"
          value={returningCustomers}
          hint="2+ bookings"
          icon={UserRound}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Search
          </button>
        }
      >
        <FilterField label="Search Customers">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, or phone..."
              className={`${filterControlClass} pl-9`}
            />
          </div>
        </FilterField>
      </FilterBar>

      {/* Customer Directory Table */}
      <SectionCard>
        {directory.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            description="No customers matched your search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3 text-left font-bold">Customer</th>
                  <th className="px-3 py-3 text-left font-bold">Contact</th>
                  <th className="px-3 py-3 text-center font-bold">Total Trips</th>
                  <th className="px-3 py-3 text-center font-bold">Active Trips</th>
                  <th className="px-3 py-3 text-left font-bold">Total Spent</th>
                  <th className="px-3 py-3 text-right font-bold">Last Booking</th>
                </tr>
              </thead>
              <tbody>
                {directory.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-3">
                      <p className="font-bold text-foreground">
                        {customer.name || "Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID #{customer.id}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {customer.email ? (
                          <span className="flex items-center gap-1.5 text-foreground">
                            <Mail className="size-3 text-muted-foreground" />
                            {customer.email}
                          </span>
                        ) : null}
                        {customer.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3 text-muted-foreground" />
                            {customer.phone}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-foreground">
                      {customer.total_bookings}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {customer.active_bookings > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {customer.active_bookings} Active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-foreground">
                      <Money value={customer.total_spent} />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-muted-foreground">
                      {customer.last_booking ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3 text-muted-foreground" />
                          {formatDate(customer.last_booking)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
