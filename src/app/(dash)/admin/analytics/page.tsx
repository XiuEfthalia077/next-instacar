import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  Car,
  CircleDollarSign,
  Filter,
  Fuel,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
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
import { formatPeso } from "@/lib/constants";
import { getFleetAnalytics, type OwnershipFilter } from "@/lib/data/analytics";
import { listBranches } from "@/lib/data/cars";
import { readFlash, searchParam } from "@/lib/flash";
import { cn } from "@/lib/utils";

export const instant = false;

export default async function AdminAnalyticsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  // Parse filters
  const startDate = searchParam(params, "start_date") || null;
  const endDate = searchParam(params, "end_date") || null;
  const branchParam = searchParam(params, "branch_id");
  const branchId = branchParam && branchParam !== "all" ? Number(branchParam) : null;
  const ownership = (searchParam(params, "ownership") || "all") as OwnershipFilter;
  const search = searchParam(params, "q") || null;

  const [branches, analytics] = await Promise.all([
    listBranches(),
    getFleetAnalytics(session, {
      startDate,
      endDate,
      branchId,
      ownership,
      search,
    }),
  ]);

  const { grandTotals, vehicles } = analytics;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Admin Analytics Dashboard"
        subtitle="Profit Sharing & Revenue Intelligence"
        description="Comprehensive profit-sharing splits, true company net calculations with vehicle amortization, and operator custodial ledgers."
      />

      <Flash {...flash} />

      {/* ── 1. High-Level Summary Cards (Grand Totals) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Gross Revenue */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Gross Revenue
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <CircleDollarSign className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-foreground">
            <Money value={grandTotals.totalGrossRevenue} />
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Total paid across {grandTotals.totalTrips} completed booking{grandTotals.totalTrips === 1 ? "" : "s"}
          </p>
        </div>

        {/* Total Company Net */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Company Net
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Building2 className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-sky-400">
            <Money value={grandTotals.totalCompanyNet} />
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Co. rent + ext + delivery cuts
          </p>
        </div>

        {/* Total Operator Payouts */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Operator Payouts
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <UserCheck className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-emerald-400">
            <Money value={grandTotals.totalOperatorPayouts} />
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Remitted to {grandTotals.operatorCarsCount} operator car{grandTotals.operatorCarsCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Total Amortization Deductions */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Total Amortization
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Banknote className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-amber-400">
            -<Money value={grandTotals.totalAmortizationDeductions} />
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {grandTotals.companyCarsCount} company-owned unit{grandTotals.companyCarsCount === 1 ? "" : "s"} financing
          </p>
        </div>

        {/* True Company Net (Company Net - Amortization) */}
        <div className="rounded-2xl border-2 border-[#ffcc00]/60 bg-[#ffcc00]/10 p-5 shadow-sm transition hover:border-[#ffcc00]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#ffcc00]">
              True Company Net
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#ffcc00] text-black shadow-xs">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className={cn("mt-2 text-xl font-black", grandTotals.trueCompanyNet >= 0 ? "text-[#ffcc00]" : "text-rose-400")}>
            <Money value={grandTotals.trueCompanyNet} />
          </p>
          <p className="mt-1 text-[11px] font-bold text-muted-foreground">
            Company Net − Amortization
          </p>
        </div>

        {/* Total Custodial Funds */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Custodial Balance
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-purple-400">
            <Money value={grandTotals.totalCustodialFunds} />
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Fuel &amp; damage reserves for repairs
          </p>
        </div>
      </div>

      {/* ── 2. Filter Bar (Date Range, Branch, Ownership, Search) ── */}
      <FilterBar
        actions={
          <Link
            href="/admin/analytics"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="size-3.5" />
            <span>Reset Filters</span>
          </Link>
        }
      >
        {/* Start Date */}
        <FilterField label="Start Date">
          <Input
            type="date"
            name="start_date"
            defaultValue={startDate ?? ""}
            className="h-11 rounded-xl border-border bg-card text-xs font-medium"
          />
        </FilterField>

        {/* End Date */}
        <FilterField label="End Date">
          <Input
            type="date"
            name="end_date"
            defaultValue={endDate ?? ""}
            className="h-11 rounded-xl border-border bg-card text-xs font-medium"
          />
        </FilterField>

        {/* Branch Filter */}
        <FilterField label="Branch">
          <select
            name="branch_id"
            defaultValue={branchId ? String(branchId) : "all"}
            className={filterControlClass}
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        </FilterField>

        {/* Ownership Filter */}
        <FilterField label="Ownership Type">
          <select
            name="ownership"
            defaultValue={ownership}
            className={filterControlClass}
          >
            <option value="all">All Fleet (Company &amp; Operator)</option>
            <option value="company">Company-Owned Only</option>
            <option value="operator">Operator-Owned Only</option>
          </select>
        </FilterField>

        {/* Search Input */}
        <FilterField label="Search Vehicle" className="min-w-[200px] flex-1">
          <Input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search brand, model, plate..."
            className="h-11 rounded-xl border-border bg-card text-xs font-medium"
          />
        </FilterField>
      </FilterBar>

      {/* ── 3. Per-Car Breakdown Table ── */}
      <SectionCard
        title={`Per-Car Revenue & Profit Split Breakdown (${vehicles.length} Vehicles)`}
        icon={BarChart3}
        description="Detailed revenue items, company cut vs operator cut, monthly amortization deductions, and custodial balances per vehicle."
        className="overflow-hidden shadow-sm"
        bodyClassName="p-0"
      >
        {vehicles.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Car}
              title="No Vehicles Matched"
              description="No vehicles match the selected date range, branch, or ownership filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-3.5 pl-6 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Vehicle Details
                  </TableHead>
                  <TableHead className="py-3.5 font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Ownership &amp; Branch
                  </TableHead>
                  <TableHead className="py-3.5 text-center font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Trips
                  </TableHead>
                  <TableHead className="py-3.5 text-right font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Gross Revenue
                  </TableHead>
                  <TableHead className="py-3.5 text-right font-extrabold text-[11px] uppercase tracking-wider text-sky-400">
                    Company Cut
                  </TableHead>
                  <TableHead className="py-3.5 text-right font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">
                    Operator Cut
                  </TableHead>
                  <TableHead className="py-3.5 text-right font-extrabold text-[11px] uppercase tracking-wider text-amber-400">
                    Amortization
                  </TableHead>
                  <TableHead className="py-3.5 text-right font-extrabold text-[11px] uppercase tracking-wider text-[#ffcc00]">
                    True Co. Net
                  </TableHead>
                  <TableHead className="py-3.5 pr-6 text-right font-extrabold text-[11px] uppercase tracking-wider text-purple-400">
                    Custodial Bal.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => {
                  const carName = `${v.brand} ${v.model}`.trim() || "Vehicle";

                  return (
                    <TableRow
                      key={v.carId}
                      className="border-b border-border/60 transition-colors hover:bg-muted/30"
                    >
                      {/* Vehicle Details */}
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-[#ffcc00]">
                            <Car className="size-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-foreground text-sm">
                              {carName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {v.plateNumber ? (
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
                                  {v.plateNumber}
                                </code>
                              ) : null}
                              <span className="text-[11px] text-muted-foreground">
                                • {v.carType}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Ownership & Branch */}
                      <TableCell className="py-4">
                        <div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide",
                              v.isCompany
                                ? "bg-sky-500/15 text-sky-400"
                                : "bg-emerald-500/15 text-emerald-400",
                            )}
                          >
                            {v.ownershipLabel}
                          </span>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {v.operatorName}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            {v.branchName}
                          </p>
                        </div>
                      </TableCell>

                      {/* Trips Count */}
                      <TableCell className="py-4 text-center">
                        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                          {v.tripsCount}
                        </span>
                      </TableCell>

                      {/* Gross Revenue */}
                      <TableCell className="py-4 text-right font-black text-foreground">
                        <Money value={v.grossRevenue} />
                      </TableCell>

                      {/* Company Cut (Company Net) */}
                      <TableCell className="py-4 text-right font-black text-sky-400">
                        <Money value={v.companyNet} />
                      </TableCell>

                      {/* Operator Cut (Operator Net: ₱0 for company cars) */}
                      <TableCell className="py-4 text-right font-black">
                        {v.isCompany ? (
                          <span className="text-muted-foreground font-semibold">₱0.00</span>
                        ) : (
                          <span className="text-emerald-400">
                            <Money value={v.operatorNet} />
                          </span>
                        )}
                      </TableCell>

                      {/* Monthly Amortization */}
                      <TableCell className="py-4 text-right font-bold text-amber-400">
                        {v.isCompany && v.monthlyAmortization > 0 ? (
                          <span>-<Money value={v.monthlyAmortization} /></span>
                        ) : (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                      </TableCell>

                      {/* True Company Net */}
                      <TableCell className="py-4 text-right font-black">
                        <span
                          className={cn(
                            v.trueCompanyNet >= 0
                              ? "text-[#ffcc00]"
                              : "text-rose-400 font-bold",
                          )}
                        >
                          <Money value={v.trueCompanyNet} />
                        </span>
                      </TableCell>

                      {/* Custodial Balance (Fuel + Damages for operators) */}
                      <TableCell className="py-4 pr-6 text-right font-bold">
                        {v.isCompany || v.custodialBalance === 0 ? (
                          <span className="text-muted-foreground font-normal">—</span>
                        ) : (
                          <span className="text-purple-400 font-extrabold">
                            <Money value={v.custodialBalance} />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
