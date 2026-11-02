import {
  Banknote,
  BarChart3,
  CalendarDays,
  Car,
  CarFront,
  CircleDollarSign,
  FileSpreadsheet,
  Receipt,
  Search,
  Settings,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { ExpenseManager } from "@/components/admin/expense-manager";
import { FinancialTelemetryChart } from "@/components/admin/financial-chart";
import { PrintButton } from "@/components/admin/print-button";
import { filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { formatPeso } from "@/lib/constants";
import { getFleetAnalytics, type OwnershipFilter, type VehicleAnalyticsItem } from "@/lib/data/analytics";
import { listBranches, listCars } from "@/lib/data/cars";
import { listExpenses, type ExpenseRecord } from "@/lib/data/expenses";
import {
  currentYear,
  expenseBreakdown,
  EXPENSE_FEE_FIELDS,
  fleetRevenue,
  incomeStatement,
  PERIODS,
  type ExpenseFeeField,
  type FleetRevenueCar,
  type Period,
} from "@/lib/data/finance";
import { monthLabel } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { cn } from "@/lib/utils";

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

const FINANCIAL_TABS = [
  { id: "overview", label: "Overview & Analytics", icon: TrendingUp },
  { id: "revenue", label: "Fleet Revenue", icon: Settings },
  { id: "expenses", label: "Expense Breakdown", icon: FileSpreadsheet },
  { id: "income", label: "Income Statement", icon: BarChart3 },
] as const;

type FinancialTab = (typeof FINANCIAL_TABS)[number]["id"];

function shortCurrency(amount: number): string {
  if (amount === 0) return "—";
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}k`;
  return `₱${amount.toLocaleString("en-PH")}`;
}

export const instant = false;

export default async function FinancialIntelligenceCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const activeTab: FinancialTab = (
    FINANCIAL_TABS.some((t) => t.id === params.tab) ? params.tab : "overview"
  ) as FinancialTab;

  const rawYear = Number.parseInt(searchParam(params, "year") || "", 10);
  const selectedYear = Number.isFinite(rawYear) && rawYear > 2000 ? rawYear : currentYear();

  const selectedPeriod: Period = PERIODS.includes(searchParam(params, "period") as Period)
    ? (searchParam(params, "period") as Period)
    : "all";

  const rawBranch = Number.parseInt(searchParam(params, "branch") || "", 10);
  const selectedBranch = Number.isFinite(rawBranch) && rawBranch > 0 ? rawBranch : null;

  const rawCar = Number.parseInt(searchParam(params, "car") || "", 10);
  const selectedCarId = Number.isFinite(rawCar) && rawCar > 0 ? rawCar : null;

  const startDate = searchParam(params, "startDate") || null;
  const endDate = searchParam(params, "endDate") || null;
  const ownership = (searchParam(params, "ownership") || "all") as OwnershipFilter;
  const query = searchParam(params, "q") || null;

  // Data prefetching based on active tab
  const [branches, carsResult, telemetryStatement] = await Promise.all([
    listBranches(),
    listCars(session, { perPage: 100 }),
    incomeStatement(session, selectedYear),
  ]);
  const cars = carsResult.rows;

  // Telemetry chart data for overview
  const telemetryData = telemetryStatement.months.map((m) => ({
    month: m.month,
    gross: m.gross,
    expenses: m.expenses,
    net: m.net,
  }));

  // Overview Data
  let analyticsData = null;
  let allExpenses: ExpenseRecord[] = [];
  if (activeTab === "overview") {
    [analyticsData, allExpenses] = await Promise.all([
      getFleetAnalytics(session, {
        startDate,
        endDate,
        branchId: selectedBranch,
        ownership,
        search: query,
      }),
      listExpenses({ startDate, endDate }),
    ]);
  }

  // Revenue Data
  let revenueCars: FleetRevenueCar[] = [];
  let revenueGrandTotal = 0;
  const revenueMonthlyTotals: Record<number, number> = {};

  if (activeTab === "revenue") {
    revenueCars = await fleetRevenue(session, {
      year: selectedYear,
      period: selectedPeriod,
      carId: selectedCarId,
    });
    revenueGrandTotal = revenueCars.reduce((sum, c) => sum + c.total, 0);
    for (const m of MONTHS) {
      revenueMonthlyTotals[m] = revenueCars.reduce((sum, c) => {
        const found = c.months.find((item) => item.month === m);
        return sum + (found ? found.gross : 0);
      }, 0);
    }
  }

  // Expenses Data
  const targetCarId = selectedCarId ?? (cars[0]?.id ?? 0);
  const expenseData = activeTab === "expenses" && targetCarId
    ? await expenseBreakdown(session, targetCarId, selectedYear)
    : null;

  // Income Statement Data
  const incomeData = telemetryStatement;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Financial Intelligence Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Unified analytics, fleet revenue telemetry, operating expense ledgers, and profit & loss statements.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          {FINANCIAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/admin/financials?tab=${tab.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  isActive
                    ? "bg-[#ffcc00] text-black shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <Flash {...flash} />

      {/* ── TAB 1: OVERVIEW & ANALYTICS ── */}
      {activeTab === "overview" && analyticsData && (
        <div className="space-y-6">
          {/* Unified StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <StatCard
              title="GROSS FLEET REVENUE"
              value={formatPeso(analyticsData.grandTotals.totalGrossRevenue)}
              subtitle={`${analyticsData.grandTotals.totalTrips} completed & settled trips`}
              icon={CircleDollarSign}
              tone="success"
            />
            <StatCard
              title="TRUE COMPANY NET"
              value={formatPeso(analyticsData.grandTotals.trueNetProfit)}
              subtitle={`After ${formatPeso(analyticsData.grandTotals.totalExpenses)} expenses`}
              icon={TrendingUp}
              tone="cyan"
            />
            <StatCard
              title="OPERATOR PAYOUTS"
              value={formatPeso(analyticsData.grandTotals.totalOperatorPayouts)}
              subtitle={`Distributed across ${analyticsData.grandTotals.operatorCarsCount} operator cars`}
              icon={UserCheck}
              tone="success"
            />
            <StatCard
              title="OPERATING EXPENSES"
              value={formatPeso(analyticsData.grandTotals.totalExpenses)}
              subtitle="Maintenance, fuel & operations"
              icon={Receipt}
              tone="danger"
            />
          </div>

          {/* Interactive SVG Telemetry Chart */}
          <FinancialTelemetryChart data={telemetryData} />

          {/* Analytics Filter Bar */}
          <form method="GET" action="/admin/financials" className="space-y-3">
            <input type="hidden" name="tab" value="overview" />
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs md:p-4">
              <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[240px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    name="q"
                    defaultValue={query || ""}
                    placeholder="Search brand, model, plate..."
                    className="pl-9 text-xs font-semibold"
                  />
                </div>

                <select
                  name="ownership"
                  defaultValue={ownership}
                  className={cn(filterControlClass, "text-xs font-semibold min-w-[140px]")}
                >
                  <option value="all">All Ownership</option>
                  <option value="company">Company-Owned</option>
                  <option value="operator">Operator-Owned</option>
                </select>

                <select
                  name="branch"
                  defaultValue={selectedBranch ? String(selectedBranch) : ""}
                  className={cn(filterControlClass, "text-xs font-semibold min-w-[140px]")}
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" className="bg-[#ffcc00] text-black font-bold hover:bg-[#ffd700]">
                  Apply Filters
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/financials?tab=overview">Reset</Link>
                </Button>
              </div>
            </div>
          </form>

          {/* Performance Table */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Vehicle Profit & Loss Roster</h3>
                <p className="text-xs text-muted-foreground">Detailed breakdown by car, rental fees, and net margins</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-bold text-xs">
                    <Receipt className="size-4 text-[#ffcc00]" />
                    Manage Expense Ledger
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Operating Expense Ledger</DialogTitle>
                    <DialogDescription>
                      Record company operating expenses, maintenance receipts, and overhead.
                    </DialogDescription>
                  </DialogHeader>
                  <ExpenseManager
                    expenses={allExpenses}
                    totalExpenses={analyticsData.grandTotals.totalExpenses}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Vehicle</TableHead>
                    <TableHead className="font-bold">Branch</TableHead>
                    <TableHead className="font-bold">Ownership</TableHead>
                    <TableHead className="text-right font-bold">Trips</TableHead>
                    <TableHead className="text-right font-bold">Gross</TableHead>
                    <TableHead className="text-right font-bold">Company Net</TableHead>
                    <TableHead className="text-right font-bold">Operator Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No vehicle telemetry found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    analyticsData.vehicles.map((v: VehicleAnalyticsItem) => (
                      <TableRow key={v.carId}>
                        <TableCell>
                          <div className="font-bold text-foreground">
                            {v.brand} {v.model}
                          </div>
                          <div className="text-xs text-muted-foreground">{v.plateNumber || "No plate"}</div>
                        </TableCell>
                        <TableCell className="text-xs">{v.branchName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold rounded-full",
                              v.isCompany
                                ? "border-cyan-500/30 text-cyan-500 bg-cyan-500/10"
                                : "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
                            )}
                          >
                            {v.ownershipLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{v.tripsCount}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-500">
                          {formatPeso(v.grossRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-cyan-400">
                          {formatPeso(v.trueCompanyNet)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-muted-foreground">
                          {formatPeso(v.operatorNet)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FLEET REVENUE MATRIX ── */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <StatCard
              title="ANNUAL FLEET GROSS"
              value={formatPeso(revenueGrandTotal)}
              subtitle={`All completed trips in ${selectedYear}`}
              icon={CircleDollarSign}
              tone="success"
            />
            <StatCard
              title="ACTIVE VEHICLES"
              value={revenueCars.length}
              subtitle="Cars generating revenue"
              icon={CarFront}
              tone="default"
            />
            <StatCard
              title="FILTERED PERIOD"
              value={selectedPeriod.replace("_", " ").toUpperCase()}
              subtitle={`Year ${selectedYear}`}
              icon={CalendarDays}
              tone="cyan"
            />
            <StatCard
              title="REPORT YEAR"
              value={selectedYear}
              subtitle="Manila Standard Time"
              icon={TrendingUp}
              tone="default"
            />
          </div>

          <form method="GET" action="/admin/financials" className="space-y-3">
            <input type="hidden" name="tab" value="revenue" />
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs md:p-4">
              <select
                name="year"
                defaultValue={selectedYear}
                className={cn(filterControlClass, "text-xs font-semibold min-w-[120px]")}
              >
                {Array.from({ length: 5 }, (_, i) => currentYear() - i).map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>

              <select
                name="period"
                defaultValue={selectedPeriod}
                className={cn(filterControlClass, "text-xs font-semibold min-w-[140px]")}
              >
                <option value="all">All Periods</option>
                <option value="this_month">This Month</option>
                <option value="last_30d">Last 30 Days</option>
                <option value="this_quarter">This Quarter</option>
              </select>

              <select
                name="branch"
                defaultValue={selectedBranch ? String(selectedBranch) : ""}
                className={cn(filterControlClass, "text-xs font-semibold min-w-[140px]")}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm" className="bg-[#ffcc00] text-black font-bold hover:bg-[#ffd700]">
                Apply
              </Button>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold min-w-[180px]">Vehicle</TableHead>
                  {MONTHS.map((m) => (
                    <TableHead key={m} className="text-center font-bold text-xs min-w-[70px]">
                      {monthLabel(m).slice(0, 3)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold min-w-[100px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueCars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                      No revenue records found for {selectedYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  revenueCars.map((c: FleetRevenueCar) => (
                    <TableRow key={c.carId}>
                      <TableCell>
                        <div className="font-bold text-foreground">
                          {c.brand} {c.model}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.plateNumber || "—"}</div>
                      </TableCell>
                      {MONTHS.map((m) => {
                        const found = c.months.find((item) => item.month === m);
                        const val = found ? found.gross : 0;
                        return (
                          <TableCell key={m} className="text-center text-xs">
                            {val > 0 ? (
                              <span className="font-semibold text-emerald-500">{shortCurrency(val)}</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-emerald-500">
                        {formatPeso(c.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  {MONTHS.map((m) => (
                    <TableCell key={m} className="text-center text-xs font-bold text-emerald-500">
                      {shortCurrency(revenueMonthlyTotals[m] ?? 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-black text-emerald-500">
                    {formatPeso(revenueGrandTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}

      {/* ── TAB 3: EXPENSE BREAKDOWN ── */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <StatCard
              title="TOTAL CAR EXPENSES"
              value={formatPeso(expenseData ? expenseData.totals.total_gross : 0)}
              subtitle={`Recorded across ${selectedYear}`}
              icon={Receipt}
              tone="danger"
            />
            <StatCard
              title="EXPENSE CATEGORIES"
              value={EXPENSE_FEE_FIELDS.length}
              subtitle="Tracked fee types"
              icon={FileSpreadsheet}
              tone="default"
            />
            <StatCard
              title="FILTERED VEHICLE"
              value={targetCarId ? (cars.find((c) => c.id === targetCarId)?.model || "Selected Car") : "No Vehicle"}
              subtitle={`Year ${selectedYear}`}
              icon={Car}
              tone="cyan"
            />
            <StatCard
              title="REPORT YEAR"
              value={selectedYear}
              subtitle="Manila Standard Time"
              icon={TrendingUp}
              tone="default"
            />
          </div>

          <form method="GET" action="/admin/financials" className="space-y-3">
            <input type="hidden" name="tab" value="expenses" />
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs md:p-4">
              <select
                name="year"
                defaultValue={selectedYear}
                className={cn(filterControlClass, "text-xs font-semibold min-w-[120px]")}
              >
                {Array.from({ length: 5 }, (_, i) => currentYear() - i).map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>

              <select
                name="car"
                defaultValue={targetCarId ? String(targetCarId) : ""}
                className={cn(filterControlClass, "text-xs font-semibold min-w-[180px]")}
              >
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand} {c.model} ({c.plate_number || "No plate"})
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm" className="bg-[#ffcc00] text-black font-bold hover:bg-[#ffd700]">
                Apply
              </Button>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold min-w-[180px]">Expense Category</TableHead>
                  {MONTHS.map((m) => (
                    <TableHead key={m} className="text-center font-bold text-xs min-w-[70px]">
                      {monthLabel(m).slice(0, 3)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold min-w-[100px]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXPENSE_FEE_FIELDS.map((category) => {
                  const total = expenseData ? expenseData.totals[category] : 0;
                  return (
                    <TableRow key={category}>
                      <TableCell className="font-bold text-foreground">
                        {CATEGORY_LABELS[category] ?? category}
                      </TableCell>
                      {MONTHS.map((m) => {
                        const monthRow = expenseData?.months.find((row) => row.month === m);
                        const val = monthRow ? monthRow[category] : 0;
                        return (
                          <TableCell key={m} className="text-center text-xs">
                            {val > 0 ? (
                              <span className="font-semibold text-rose-500">{shortCurrency(val)}</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-rose-500">
                        {formatPeso(total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total Expenses</TableCell>
                  {MONTHS.map((m) => {
                    const monthRow = expenseData?.months.find((row) => row.month === m);
                    const val = monthRow ? monthRow.total_gross : 0;
                    return (
                      <TableCell key={m} className="text-center text-xs font-bold text-rose-500">
                        {shortCurrency(val)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-black text-rose-500">
                    {formatPeso(expenseData ? expenseData.totals.total_gross : 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}

      {/* ── TAB 4: INCOME STATEMENT ── */}
      {activeTab === "income" && incomeData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            <StatCard
              title="ANNUAL GROSS"
              value={formatPeso(incomeData.totals.gross)}
              subtitle={`Total gross revenue ${selectedYear}`}
              icon={CircleDollarSign}
              tone="success"
            />
            <StatCard
              title="NET COMPANY PROFIT"
              value={formatPeso(incomeData.totals.net)}
              subtitle="After operator & operating costs"
              icon={TrendingUp}
              tone="cyan"
            />
            <StatCard
              title="OPERATOR SHARE"
              value={formatPeso(incomeData.totals.operator)}
              subtitle="Distributed to fleet owners"
              icon={UserCheck}
              tone="success"
            />
            <StatCard
              title="TOTAL EXPENSES"
              value={formatPeso(incomeData.totals.expenses)}
              subtitle="Operating and maintenance costs"
              icon={Receipt}
              tone="danger"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <form method="GET" action="/admin/financials" className="flex items-center gap-3">
              <input type="hidden" name="tab" value="income" />
              <select
                name="year"
                defaultValue={selectedYear}
                onChange={(e) => e.currentTarget.form?.submit()}
                className={cn(filterControlClass, "text-xs font-semibold min-w-[140px]")}
              >
                {Array.from({ length: 5 }, (_, i) => currentYear() - i).map((y) => (
                  <option key={y} value={y}>
                    Fiscal Year {y}
                  </option>
                ))}
              </select>
            </form>

            <PrintButton />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Month</TableHead>
                  <TableHead className="text-right font-bold">Gross Revenue</TableHead>
                  <TableHead className="text-right font-bold">Operator Payouts</TableHead>
                  <TableHead className="text-right font-bold">Staff / Agent Fees</TableHead>
                  <TableHead className="text-right font-bold">Expenses</TableHead>
                  <TableHead className="text-right font-bold">Net Profit</TableHead>
                  <TableHead className="text-right font-bold">Profit Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeData.months.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No income statement records found for {selectedYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  incomeData.months.map((m) => {
                    const margin = m.gross > 0 ? (m.net / m.gross) * 100 : 0;
                    return (
                      <TableRow key={m.month}>
                        <TableCell className="font-bold text-foreground">
                          {monthLabel(m.month)} {selectedYear}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-500">
                          {formatPeso(m.gross)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-muted-foreground">
                          {formatPeso(m.operator)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-muted-foreground">
                          {formatPeso(m.staffAgent)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-500">
                          {formatPeso(m.expenses)}
                        </TableCell>
                        <TableCell className="text-right font-black text-cyan-400">
                          {formatPeso(m.net)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold rounded-full",
                              margin >= 30
                                ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                                : margin > 0
                                  ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                                  : "border-rose-500/30 text-rose-500 bg-rose-500/10",
                            )}
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Annual Totals</TableCell>
                  <TableCell className="text-right font-black text-emerald-500">
                    {formatPeso(incomeData.totals.gross)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    {formatPeso(incomeData.totals.operator)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    {formatPeso(incomeData.totals.staffAgent)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-rose-500">
                    {formatPeso(incomeData.totals.expenses)}
                  </TableCell>
                  <TableCell className="text-right font-black text-cyan-400">
                    {formatPeso(incomeData.totals.net)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {incomeData.totals.gross > 0
                      ? `${((incomeData.totals.net / incomeData.totals.gross) * 100).toFixed(1)}%`
                      : "0%"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
