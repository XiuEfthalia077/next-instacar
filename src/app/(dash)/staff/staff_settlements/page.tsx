import {
  AlertCircle,
  BadgeCheck,
  Clock,
  DollarSign,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { requireRole } from "@/lib/auth";
import { pendingSettlements } from "@/lib/data/finance";
import { formatDate, formatTime } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function StaffSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  const filterType = searchParam(params, "type") || "all";

  const allPending = await pendingSettlements(session);

  const filtered = allPending.filter((item) => {
    if (filterType !== "all" && item.booking_type !== filterType) return false;
    return true;
  });

  const totalValue = filtered.reduce(
    (acc, item) => acc + Number(item.total_price ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Pending Settlements"
        subtitle="Operations & Finance"
        description="Review completed bookings awaiting fee breakdown and operator settlement clearance."
      />

      <Flash {...flash} />

      {/* KPI Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pending Settlements"
          value={filtered.length}
          hint="Completed bookings"
          icon={AlertCircle}
          tone="primary"
        />
        <StatCard
          label="Total Pending Value"
          value={<Money value={totalValue} />}
          hint="Gross revenue awaiting settlement"
          icon={Wallet}
        />
        <StatCard
          label="Status"
          value="Settlement Ready"
          hint="Calculate fees & mark settled"
          icon={BadgeCheck}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Filter
          </button>
        }
      >
        <FilterField label="Booking Type">
          <select
            name="type"
            defaultValue={filterType}
            className={filterControlClass}
          >
            <option value="all">All Booking Types</option>
            <option value="online">Online Bookings</option>
            <option value="manual">Manual Bookings</option>
          </select>
        </FilterField>
      </FilterBar>

      {/* Settlements Table */}
      <SectionCard title="Completed Trips Awaiting Settlement" icon={Clock}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="All Clear!"
            description="There are currently no completed bookings waiting for financial settlement."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3 text-left font-bold">Booking</th>
                  <th className="px-3 py-3 text-left font-bold">Customer</th>
                  <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                  <th className="px-3 py-3 text-left font-bold">Completed Date</th>
                  <th className="px-3 py-3 text-left font-bold">Total Price</th>
                  <th className="px-3 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const carName =
                    [item.brand, item.model].filter(Boolean).join(" ") || "Vehicle";
                  const customer = item.member_name || item.guest_name || "Guest";

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-3 font-semibold text-foreground">
                        <span className="font-bold">#BK-{item.id}</span>
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase font-bold text-muted-foreground">
                          {item.booking_type || "online"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{customer}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{carName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.plate_number ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDate(item.end_date)} ({formatTime(item.return_time)})
                      </td>
                      <td className="px-3 py-3 font-bold text-foreground">
                        <Money value={item.total_price} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/shared/booking_details?id=${item.id}#settlement`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffcc00] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#ffd633]"
                        >
                          <DollarSign className="size-3.5" />
                          Settle Now
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
