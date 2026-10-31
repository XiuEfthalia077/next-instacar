import {
  CalendarRange,
  CarFront,
  CircleDollarSign,
  Coins,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { getSupabase, requireRole } from "@/lib/auth";
import { operatorCars } from "@/lib/data/cars";
import {
  currentYear,
  num,
  operatorRevenue,
  yearOf,
  yearOptions,
} from "@/lib/data/finance";
import { fetchRows } from "@/lib/data/scope";
import { monthLabel } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

/**
 * Operator earnings — port of `car-rental/pages/operator/revenue.php`.
 *
 * Only `Completed` bookings of the operator's own cars are counted. Gross is
 * the settled `total_gross` (or the booking total when there is no payment
 * row) and the payout is the settled `total_net` (or 80% of the total).
 */
export const instant = false;

export default async function OperatorRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("operator");
  const params = await searchParams;
  const flash = readFlash(params);

  const cars = await operatorCars(session);
  const carIds = cars.map((car) => car.id);

  const supabase = await getSupabase();

  const yearRows = carIds.length
    ? await fetchRows<{ created_at: string | null }>(
        supabase
          .from("bookings")
          .select("created_at")
          .in("car_id", carIds)
          .eq("status", "Completed"),
      )
    : [];

  const years = yearOptions(yearRows.map((row) => yearOf(row.created_at)));

  const rawYear = Number.parseInt(searchParam(params, "year") ?? "", 10);
  const selectedYear =
    Number.isFinite(rawYear) && rawYear > 2000 ? rawYear : currentYear();

  const rawCar = searchParam(params, "car_id") ?? "all";
  const parsedCar = Number.parseInt(rawCar, 10);
  const selectedCar =
    rawCar !== "all" &&
    Number.isFinite(parsedCar) &&
    carIds.includes(parsedCar)
      ? parsedCar
      : null;

  const { cars: revenueCars, total, totalShare } = await operatorRevenue(
    session,
    selectedYear,
    selectedCar,
  );

  return (
    <>
      <PageHeader
        title="Earnings Report"
        subtitle="My Revenue"
        description={`Financial performance for ${selectedYear}`}
      />

      <Flash {...flash} />

      {/* Summary + totals */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(255,204,0,0.4)] lg:col-span-1">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/90">
              Total Net Payout (80%)
            </p>
            <p className="mt-1 text-3xl font-black">
              <Money value={totalShare} />
            </p>
          </div>
          <Wallet className="size-12 shrink-0 text-white/25" />
        </div>

        <StatCard
          label="Gross Sales"
          value={<Money value={total} />}
          hint={`Completed bookings in ${selectedYear}`}
          icon={CircleDollarSign}
          tone="primary"
        />
        <StatCard
          label="Vehicles Earning"
          value={revenueCars.length}
          hint={selectedCar ? "Selected vehicle" : "Across the whole fleet"}
          icon={CarFront}
          tone="info"
        />
      </div>

      {/* Filter Controls Form Panel */}
      <FilterBar
        actions={
          <>
            <Button
              type="submit"
              size="sm"
              className="h-10 rounded-[10px] px-4 font-bold"
            >
              Apply
            </Button>
            <Link
              href="/operator/revenue"
              className="inline-flex h-10 items-center rounded-[10px] border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Reset
            </Link>
          </>
        }
      >
        <FilterField label="Vehicle" className="min-w-[240px] flex-[2]">
          <select
            name="car_id"
            defaultValue={selectedCar === null ? "all" : String(selectedCar)}
            className={filterControlClass}
          >
            <option value="all">All Vehicles</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {[car.brand, car.model].filter(Boolean).join(" ")} (
                {car.plate_number ?? "No plate"})
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Year" className="max-w-[160px]">
          <select
            name="year"
            defaultValue={String(selectedYear)}
            className={filterControlClass}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {revenueCars.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={Coins}
            title="No Earnings History"
            description={`No completed bookings found for this vehicle selection matching ${selectedYear}.`}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {revenueCars.map((car) => {
            const carName =
              [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
            const label = car.plateNumber
              ? `${carName} (${car.plateNumber})`
              : carName;

            return (
              <SectionCard
                key={car.carId}
                title={label}
                icon={CarFront}
                actions={
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ffcc00]/15 px-3 py-1 text-xs font-bold text-[#b38a00]">
                    <CalendarRange className="size-3.5" />
                    {selectedYear}
                  </span>
                }
                bodyClassName="overflow-x-auto"
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                      {car.months.length} month
                      {car.months.length === 1 ? "" : "s"} with completed
                      bookings
                    </span>
                    <span className="flex flex-wrap items-center gap-4">
                      <span>
                        Gross:{" "}
                        <strong className="text-foreground">
                          <Money value={car.total} />
                        </strong>
                      </span>
                      <span>
                        My Payout:{" "}
                        <strong className="text-[#b38a00]">
                          <Money value={car.totalShare} />
                        </strong>
                      </span>
                    </span>
                  </div>
                }
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 text-left font-bold">Month</th>
                      <th className="px-4 py-3 text-center font-bold">
                        Gross Sales
                      </th>
                      <th className="px-4 py-3 text-right font-bold">
                        My Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {car.months.map((month) => (
                      <tr
                        key={`${car.carId}-${month.month}`}
                        className="border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3 font-bold uppercase text-foreground">
                          {monthLabel(month.month)}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          <Money value={month.gross} />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#b38a00]">
                          <Money value={month.myShare} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40">
                      <td className="px-4 py-3 font-extrabold uppercase tracking-wide text-foreground">
                        Total
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-foreground">
                        <Money value={car.total} />
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#b38a00]">
                        <Money value={car.totalShare} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </SectionCard>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Payouts use the settled operator share ({num(80)}% fallback when a
        booking has no payment record).
      </p>
    </>
  );
}
