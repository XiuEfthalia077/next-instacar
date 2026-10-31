import {
  CalendarDays,
  CarFront,
  Coins,
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
import { currentYear, staffRevenue } from "@/lib/data/finance";
import { readFlash, searchParam } from "@/lib/flash";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const instant = false;

export default async function StaffRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  const yearParam = searchParam(params, "year");
  const year = yearParam ? Number(yearParam) : currentYear();

  const data = await staffRevenue(session, year);

  // Compute monthly sums
  const monthSums = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    return data.cars.reduce((sum, car) => {
      const match = car.months.find((m) => m.month === monthNum);
      return sum + (match?.gross ?? 0);
    }, 0);
  });

  const bestMonthIdx = monthSums.indexOf(Math.max(...monthSums, 0));
  const bestMonthLabel = monthSums[bestMonthIdx] > 0 ? `${MONTHS[bestMonthIdx]} ${year}` : "—";

  return (
    <>
      <PageHeader
        title="Branch Revenue Matrix"
        subtitle="Financial Accounting"
        description={`Monthly revenue distribution per vehicle for completed rentals in year ${year}.`}
      />

      <Flash {...flash} />

      {/* KPI Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Completed Revenue"
          value={<Money value={data.total} />}
          hint={`All completed trips in ${year}`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Active Fleet with Revenue"
          value={data.cars.length}
          hint="Vehicles with rentals"
          icon={CarFront}
        />
        <StatCard
          label="Peak Earning Month"
          value={bestMonthLabel}
          hint={monthSums[bestMonthIdx] > 0 ? `₱${monthSums[bestMonthIdx].toLocaleString("en-PH")}` : "No completed rentals"}
          icon={TrendingUp}
        />
      </div>

      {/* Year Filter */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Filter Year
          </button>
        }
      >
        <FilterField label="Calendar Year">
          <select
            name="year"
            defaultValue={year}
            className={filterControlClass}
          >
            {[currentYear(), currentYear() - 1, currentYear() - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {/* 12-Month Matrix Table */}
      <SectionCard title="12-Month Revenue Matrix" icon={CalendarDays}>
        {data.cars.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="No Completed Rentals"
            description={`No completed rentals with revenue were found for year ${year}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 bg-muted/90 px-3 py-3 text-left font-bold backdrop-blur">
                    Vehicle
                  </th>
                  {MONTHS.map((m) => (
                    <th key={m} className="px-2 py-3 text-right font-bold">
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-bold text-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.cars.map((car) => {
                  const carName =
                    [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";

                  return (
                    <tr
                      key={car.carId}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="sticky left-0 bg-card px-3 py-3 font-semibold text-foreground">
                        <p className="font-bold">{carName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {car.plateNumber ?? "—"}
                        </p>
                      </td>
                      {MONTHS.map((_, i) => {
                        const mNum = i + 1;
                        const match = car.months.find((m) => m.month === mNum);
                        const gross = match?.gross ?? 0;

                        return (
                          <td
                            key={mNum}
                            className={`px-2 py-3 text-right tabular-nums ${
                              gross > 0 ? "font-semibold text-foreground" : "text-muted-foreground/40"
                            }`}
                          >
                            {gross > 0 ? `₱${Math.round(gross).toLocaleString("en-PH")}` : "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-right font-bold text-foreground">
                        <Money value={car.total} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40 font-bold text-foreground">
                  <td className="sticky left-0 bg-muted/90 px-3 py-3 uppercase tracking-wider backdrop-blur">
                    Monthly Total
                  </td>
                  {monthSums.map((sum, i) => (
                    <td key={i} className="px-2 py-3 text-right tabular-nums">
                      {sum > 0 ? `₱${Math.round(sum).toLocaleString("en-PH")}` : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right text-sm font-black text-[#b38a00]">
                    <Money value={data.total} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
