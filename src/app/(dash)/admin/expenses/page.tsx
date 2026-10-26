import { CalendarDays, CarFront, ClipboardList, TrendingUp } from "lucide-react";

import { AutoSubmitForm } from "@/components/admin/auto-submit";
import { EmptyState } from "@/components/common/empty-state";
import { filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { listBranches, listCars } from "@/lib/data/cars";
import {
  currentYear,
  EXPENSE_FEE_FIELDS,
  expenseBreakdown,
  type ExpenseFeeField,
} from "@/lib/data/finance";
import { monthLabel } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const CATEGORY_LABELS: Record<ExpenseFeeField, string> = {
  daily_rent: "Daily Rent",
  carwash: "Carwash",
  extension_fee: "Extension Fee",
  delivery_fee: "Delivery Fee",
  pickup_fee: "Pickup Fee",
  fuel: "Fuel",
  driver_fee: "Driver Fee",
  damage_fee: "Damage Fee",
  agent_fee: "Agent Fee",
  others: "Others",
};

const CATEGORIES = EXPENSE_FEE_FIELDS.map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
}));

/** Legacy `number_format($value)` — whole pesos with thousands separators. */
function wholePeso(value: number): string {
  return `₱${Math.round(value).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Fleet Breakdown — port of `car-rental/pages/admin/expenses.php`.
 *
 * Keeps the inline vehicle selector, the three KPI tiles, the twelve month
 * summary cards and the fee-distribution matrix with its TOTAL NET REVENUE
 * footer. The mobile month cards mirror the desktop table.
 */
export const instant = false;

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const year = currentYear();

  const carParam = Number.parseInt(searchParam(params, "car_id") ?? "", 10);
  const requestedCarId = Number.isFinite(carParam) && carParam > 0 ? carParam : null;

  const [fleet, branches] = await Promise.all([
    listCars(session, { perPage: 500 }),
    listBranches(),
  ]);

  const cars = [...fleet.rows].sort((a, b) => {
    const brand = (a.brand ?? "").localeCompare(b.brand ?? "");
    if (brand !== 0) return brand;
    return (a.model ?? "").localeCompare(b.model ?? "");
  });

  // The PHP page verifies that the selected car belongs to the branch view.
  const selectedCar = requestedCarId
    ? cars.find((car) => car.id === requestedCarId) ?? null
    : null;

  const branchLabel =
    session.viewBranch === "all"
      ? "All Branches"
      : branches.find((branch) => branch.id === session.viewBranch)?.name ??
        "All Branches";

  const breakdown = selectedCar
    ? await expenseBreakdown(session, selectedCar.id, year)
    : null;

  const monthlyData = new Map(
    (breakdown?.months ?? []).map((row) => [row.month, row]),
  );

  const yearGross =
    breakdown?.months.reduce((total, row) => total + row.total_gross, 0) ?? 0;
  const yearNet =
    breakdown?.months.reduce((total, row) => total + row.total_net, 0) ?? 0;

  const selectedCarLabel = selectedCar
    ? `${[selectedCar.brand, selectedCar.model].filter(Boolean).join(" ")} (${selectedCar.plate_number ?? "—"})`
    : "";

  return (
    <>
      <PageHeader
        title="Fleet Breakdown"
        description={`${branchLabel} · Performance Review for Fiscal Year ${year}`}
        actions={
          <AutoSubmitForm className="flex w-full min-w-[260px] max-w-[300px] flex-col">
            <label className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
              <CarFront className="size-3.5 text-[#b38a00]" />
              Vehicle
            </label>
            <select
              name="car_id"
              defaultValue={selectedCar ? String(selectedCar.id) : ""}
              className={filterControlClass}
            >
              <option value="">— Select a Vehicle —</option>
              {cars.map((car) => (
                <option key={car.id} value={String(car.id)}>
                  {[car.brand, car.model].filter(Boolean).join(" ") || "Vehicle"} (
                  {car.plate_number ?? "—"})
                </option>
              ))}
            </select>
          </AutoSubmitForm>
        }
      />

      <Flash {...flash} />

      {!selectedCar || !breakdown ? (
        <SectionCard>
          <EmptyState
            icon={TrendingUp}
            title="No Vehicle Selected"
            description="Choose a vehicle from the dropdown to view its monthly breakdown."
          />
        </SectionCard>
      ) : (
        <>
          {/* Stats row */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <StatCard
              label="Year Gross"
              value={<Money value={yearGross} />}
              hint="All fee categories combined"
            />
            <StatCard
              label="Year Net"
              value={
                <span
                  className={
                    yearNet >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  }
                >
                  <Money value={yearNet} />
                </span>
              }
              hint="Gross minus staff/agent payouts"
            />
            <StatCard
              label="Currently Viewing"
              value={<span className="text-base font-bold">{selectedCarLabel}</span>}
              hint="Vehicle breakdown"
            />
          </div>

          {/* Monthly summary */}
          <div className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">
            <CalendarDays className="size-4 text-[#b38a00]" />
            Monthly Summary
          </div>

          <div className="mb-4 flex gap-3 overflow-x-auto px-1 pb-3.5 pt-1.5">
            {MONTHS.map((month) => {
              const data = monthlyData.get(month);
              const gross = data?.total_gross ?? 0;
              const net = data?.total_net ?? 0;
              const isEmpty = gross <= 0 && net <= 0;

              return (
                <div
                  key={month}
                  className={
                    isEmpty
                      ? "min-w-[150px] flex-none rounded-2xl border border-border bg-slate-50/70 p-3.5 opacity-70 shadow-sm dark:bg-slate-950/40"
                      : "min-w-[150px] flex-none rounded-2xl border border-border bg-card p-3.5 shadow-sm"
                  }
                >
                  <span
                    className={
                      isEmpty
                        ? "mb-2 block border-b border-border pb-1.5 text-center text-[11px] font-extrabold tracking-wide text-slate-400"
                        : "mb-2 block border-b border-border pb-1.5 text-center text-[11px] font-extrabold tracking-wide text-[#b38a00]"
                    }
                  >
                    {monthLabel(month).toUpperCase()}
                  </span>

                  <div className="flex items-center justify-between py-0.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Gross
                    </span>
                    <span
                      className={
                        isEmpty
                          ? "font-semibold text-slate-400"
                          : "font-extrabold text-foreground"
                      }
                    >
                      {isEmpty ? "—" : wholePeso(gross)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Net
                    </span>
                    <span
                      className={
                        isEmpty
                          ? "font-semibold text-slate-400"
                          : net >= 0
                            ? "font-extrabold text-emerald-700 dark:text-emerald-400"
                            : "font-extrabold text-rose-700 dark:text-rose-400"
                      }
                    >
                      {isEmpty ? "—" : wholePeso(net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expense & fee distribution heading */}
          <div className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">
            <ClipboardList className="size-4 text-[#b38a00]" />
            Expense &amp; Fee Distribution
          </div>

          {/* Desktop table */}
          <div className="mb-4 hidden lg:block">
            <SectionCard bodyClassName="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="min-w-[170px] pl-4 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                      Category
                    </TableHead>
                    {MONTHS.map((month) => (
                      <TableHead
                        key={month}
                        className="text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        {monthLabel(month).toUpperCase()}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {CATEGORIES.map(({ key, label }) => (
                    <TableRow key={key} className="transition-colors hover:bg-amber-500/10 dark:hover:bg-amber-400/10">
                      <TableCell className="pl-4 font-bold text-slate-700 dark:text-slate-200">
                        {label}
                      </TableCell>
                      {MONTHS.map((month) => {
                        const value = monthlyData.get(month)?.[key] ?? 0;
                        return (
                          <TableCell
                            key={month}
                            className={
                              value > 0
                                ? "min-w-[95px] text-center font-bold text-foreground"
                                : "min-w-[95px] text-center font-medium text-slate-400"
                            }
                          >
                            {value > 0 ? wholePeso(value) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow className="border-t-2 border-slate-950 bg-slate-900 hover:bg-slate-900">
                    <TableCell className="pl-4 font-extrabold text-white">
                      TOTAL NET REVENUE
                    </TableCell>
                    {MONTHS.map((month) => {
                      const net = monthlyData.get(month)?.total_net ?? 0;
                      return (
                        <TableCell
                          key={month}
                          className={
                            net >= 0
                              ? "text-center font-extrabold text-green-400"
                              : "text-center font-extrabold text-red-300"
                          }
                        >
                          {wholePeso(net)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableFooter>
              </Table>
            </SectionCard>
          </div>

          {/* Mobile cards */}
          <div className="space-y-4 lg:hidden">
            {breakdown.months.map((row) => (
              <div
                key={row.month}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-extrabold tracking-wide text-[#b38a00]">
                  {monthLabel(row.month).toUpperCase()}
                </div>

                {CATEGORIES.map(({ key, label }) => {
                  const value = row[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0"
                    >
                      <span className="font-semibold text-muted-foreground">
                        {label}
                      </span>
                      <span
                        className={
                          value > 0
                            ? "font-bold text-foreground"
                            : "font-semibold text-slate-400"
                        }
                      >
                        {value > 0 ? wholePeso(value) : "—"}
                      </span>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5 text-sm">
                  <span className="font-bold text-foreground">Net Total</span>
                  <span
                    className={
                      row.total_net >= 0
                        ? "font-extrabold text-emerald-700 dark:text-emerald-400"
                        : "font-extrabold text-rose-700 dark:text-rose-400"
                    }
                  >
                    {wholePeso(row.total_net)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
