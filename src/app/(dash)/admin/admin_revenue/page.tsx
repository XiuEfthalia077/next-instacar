import { CarFront, RotateCcw, Search, TrendingUp } from "lucide-react";
import Link from "next/link";

import { FormAutoSubmit } from "@/components/admin/auto-submit";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { listBranches, listCars } from "@/lib/data/cars";
import { currentYear, fleetRevenue, PERIODS, type Period } from "@/lib/data/finance";
import { formatPeso } from "@/lib/constants";
import { monthLabel } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Legacy `shortCurrency()` in `pages/admin/admin_revenue.php`.
 * 1,250,000 -> ₱1.3M · 18,400 -> ₱18.4k · 950 -> ₱950
 */
function shortCurrency(amount: number): string {
  if (amount === 0) return "—";
  if (amount >= 1_000_000) {
    return `₱${Math.round((amount / 1_000_000) * 10) / 10}M`;
  }
  if (amount >= 1_000) {
    return `₱${Math.round((amount / 1_000) * 10) / 10}k`;
  }
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

/**
 * Fleet Revenue — port of `car-rental/pages/admin/admin_revenue.php`.
 *
 * The page keeps the legacy KPI tiles, the period / booking type / car / search
 * filters and the per-car monthly gross matrix (with the YEAR TOTAL column).
 */
export const instant = false;

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const year = currentYear();

  // ── Filter params (same validation as the PHP page) ──
  const periodParam = searchParam(params, "period");
  const period: Period = PERIODS.includes(periodParam as Period)
    ? (periodParam as Period)
    : "all";

  const typeParam = searchParam(params, "type");
  const bookingType =
    typeParam === "online" || typeParam === "manual" ? typeParam : "all";

  const carParam = Number.parseInt(searchParam(params, "car_id") ?? "0", 10);
  const carId = Number.isFinite(carParam) && carParam > 0 ? carParam : null;

  const search = (searchParam(params, "q") ?? "").trim();

  const [fleet, branches, revenue] = await Promise.all([
    listCars(session, { perPage: 500 }),
    listBranches(),
    fleetRevenue(session, {
      year,
      period,
      bookingType: bookingType === "all" ? null : bookingType,
      carId,
    }),
  ]);

  const branchLabel =
    session.viewBranch === "all"
      ? "All Branches"
      : branches.find((branch) => branch.id === session.viewBranch)?.name ??
        "All Branches";

  const carOptions = [...fleet.rows].sort((a, b) => {
    const brand = (a.brand ?? "").localeCompare(b.brand ?? "");
    if (brand !== 0) return brand;
    return (a.model ?? "").localeCompare(b.model ?? "");
  });

  // ── KPI numbers ──
  const monthlyTotals = new Map<number, number>();
  let totalYearlyGross = 0;

  for (const car of revenue) {
    totalYearlyGross += car.total;
    for (const month of car.months) {
      monthlyTotals.set(
        month.month,
        (monthlyTotals.get(month.month) ?? 0) + month.gross,
      );
    }
  }

  let bestMonth = 0;
  let bestMonthValue = 0;
  for (const [month, value] of monthlyTotals) {
    if (value > bestMonthValue) {
      bestMonth = month;
      bestMonthValue = value;
    }
  }

  // Legacy `arsort($car_totals_temp)` — highest yearly gross first.
  const sortedCars = [...revenue].sort((a, b) => b.total - a.total);

  const hasData = sortedCars.length > 0;
  const visibleCars = search
    ? sortedCars.filter((car) =>
        `${car.brand ?? ""} ${car.model ?? ""} ${car.plateNumber ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : sortedCars;

  return (
    <>
      <PageHeader
        title="Fleet Revenue"
        description={`${branchLabel} · Earnings for ${year}`}
      />

      <Flash {...flash} />

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={`Total Gross (${year})`}
          value={<Money value={totalYearlyGross} />}
          hint="All completed trips"
        />
        <StatCard
          label="Cars With Revenue"
          value={revenue.length}
          hint="At least 1 completed trip"
        />
        <StatCard
          label="Best Month"
          value={bestMonth ? `${monthLabel(bestMonth).toUpperCase()} ${year}` : "—"}
          hint={bestMonthValue > 0 ? formatPeso(bestMonthValue) : "No data yet"}
        />
      </div>

      {/* Filter bar */}
      <FilterBar
        actions={
          <Link
            href="/admin/admin_revenue"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-4" />
            Reset
          </Link>
        }
      >
        <FormAutoSubmit />

        <FilterField label="Period">
          <select name="period" defaultValue={period} className={filterControlClass}>
            <option value="all">All Year</option>
            <option value="this_month">This Month</option>
            <option value="last_30d">Last 30 Days</option>
            <option value="this_quarter">This Quarter</option>
          </select>
        </FilterField>

        <FilterField label="Type">
          <select name="type" defaultValue={bookingType} className={filterControlClass}>
            <option value="all">All Types</option>
            <option value="online">Online</option>
            <option value="manual">Manual</option>
          </select>
        </FilterField>

        <FilterField label="Car" className="min-w-[220px] flex-[1.5]">
          <select
            name="car_id"
            defaultValue={String(carId ?? 0)}
            className={filterControlClass}
          >
            <option value="0">All Cars</option>
            {carOptions.map((car) => (
              <option key={car.id} value={String(car.id)}>
                {[car.brand, car.model].filter(Boolean).join(" ") || "Vehicle"} (
                {car.plate_number ?? "—"})
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Search" className="min-w-[190px] flex-[1.2]">
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search car or plate..."
            className="h-10 rounded-[10px] border-border bg-card text-sm font-medium"
          />
        </FilterField>
      </FilterBar>

      {!hasData ? (
        <SectionCard>
          <EmptyState
            icon={TrendingUp}
            title="No Revenue Data Found"
            description={`No completed bookings found for ${year} in this view.`}
          />
        </SectionCard>
      ) : visibleCars.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Search}
            title="No cars match your search"
            description="Try a different car name or plate number."
          />
        </SectionCard>
      ) : (
        visibleCars.map((car) => {
          const monthMap = new Map(car.months.map((month) => [month.month, month.gross]));
          const carName = `${car.brand ?? ""} ${car.model ?? ""} (${car.plateNumber ?? "—"})`;

          return (
            <SectionCard
              key={car.carId}
              title={carName}
              icon={CarFront}
              className="mb-4 last:mb-0"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      {MONTHS.map((month) => (
                        <TableHead
                          key={month}
                          className="text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          {monthLabel(month).toUpperCase()}
                        </TableHead>
                      ))}
                      <TableHead className="bg-slate-900 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                        Year Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    <TableRow className="transition-colors hover:bg-amber-500/10 dark:hover:bg-amber-400/10">
                      {MONTHS.map((month) => {
                        const gross = monthMap.get(month) ?? 0;
                        return (
                          <TableCell
                            key={month}
                            className="min-w-[90px] text-center text-sm font-semibold text-foreground"
                          >
                            {gross > 0 ? (
                              shortCurrency(gross)
                            ) : (
                              <span className="font-medium text-slate-400">—</span>
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell className="min-w-[130px] bg-amber-500/10 text-center dark:bg-amber-400/10">
                        <span className="text-sm font-extrabold text-[#b38a00] dark:text-[#ffd700]">
                          <Money value={car.total} />
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          );
        })
      )}
    </>
  );
}
