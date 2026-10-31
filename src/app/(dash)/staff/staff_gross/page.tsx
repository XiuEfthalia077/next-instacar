import {
  BarChart3,
  CalendarDays,
  CarFront,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { requireRole } from "@/lib/auth";
import { currentYear, staffGross } from "@/lib/data/finance";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function StaffGrossPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  const yearParam = searchParam(params, "year");
  const year = yearParam ? Number(yearParam) : currentYear();
  const period = (searchParam(params, "period") as "all" | "this_month" | "last_30d" | "this_quarter") || "all";
  const bookingType = searchParam(params, "type") || "all";
  const carIdParam = searchParam(params, "car_id");
  const carId = carIdParam && carIdParam !== "all" ? Number(carIdParam) : null;

  const data = await staffGross(session, {
    year,
    period,
    bookingType: bookingType !== "all" ? bookingType : undefined,
    carId,
  });

  return (
    <>
      <PageHeader
        title="Gross Earnings"
        subtitle="Revenue & Performance"
        description={`Branch gross earnings breakdown for year ${year}.`}
      />

      <Flash {...flash} />

      {/* KPI Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Gross"
          value={<Money value={data.totalGross} />}
          hint={`All settled (${year})`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Settled Bookings"
          value={data.bookingsCount}
          hint="Total completed trips"
          icon={CalendarDays}
        />
        <StatCard
          label="Avg / Booking"
          value={<Money value={data.avgPerBooking} />}
          hint="Average ticket"
          icon={TrendingUp}
        />
        <StatCard
          label="Top Vehicle"
          value={data.bestCar ? [data.bestCar.brand, data.bestCar.model].filter(Boolean).join(" ") : "—"}
          hint={data.bestCar ? `Earned ₱${data.bestCar.total.toLocaleString("en-PH")}` : "No data"}
          icon={CarFront}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Apply
          </button>
        }
      >
        <FilterField label="Period">
          <select
            name="period"
            defaultValue={period}
            className={filterControlClass}
          >
            <option value="all">Full Year ({year})</option>
            <option value="this_month">This Month</option>
            <option value="last_30d">Last 30 Days</option>
            <option value="this_quarter">This Quarter</option>
          </select>
        </FilterField>

        <FilterField label="Booking Type">
          <select
            name="type"
            defaultValue={bookingType}
            className={filterControlClass}
          >
            <option value="all">All Booking Types</option>
            <option value="online">Online Bookings</option>
            <option value="manual">Manual Bookings</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Monthly Breakdown */}
        <div className="lg:col-span-5">
          <SectionCard title="Monthly Breakdown" icon={BarChart3}>
            {data.months.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No revenue records found for {year}.
              </p>
            ) : (
              <div className="space-y-3">
                {data.months.map((m) => {
                  const monthName = new Date(year, m.month - 1).toLocaleString("en-US", {
                    month: "long",
                  });
                  const percentage =
                    data.totalGross > 0
                      ? Math.round((m.total / data.totalGross) * 100)
                      : 0;

                  return (
                    <div key={m.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-foreground">{monthName}</span>
                        <span className="text-muted-foreground">
                          <Money value={m.total} /> ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#ffcc00]"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Vehicle Performance */}
        <div className="lg:col-span-7">
          <SectionCard title="Vehicle Revenue Leaderboard" icon={CarFront}>
            {data.cars.length === 0 ? (
              <EmptyState
                icon={CarFront}
                title="No Vehicles"
                description="No settled earnings recorded for vehicles in this period."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                      <th className="px-3 py-3 text-left font-bold">Plate</th>
                      <th className="px-3 py-3 text-right font-bold">Total Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cars.map((car) => (
                      <tr
                        key={car.carId}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-3 py-3 font-semibold text-foreground">
                          {[car.brand, car.model].filter(Boolean).join(" ") || "Vehicle"}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {car.plateNumber ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-foreground">
                          <Money value={car.total} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
