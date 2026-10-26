import { FileSpreadsheet, Info } from "lucide-react";
import Link from "next/link";

import { PrintButton } from "@/components/admin/print-button";
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
import { connection } from "next/server";
import { requireRole } from "@/lib/auth";
import { currentYear, incomeStatement } from "@/lib/data/finance";
import { manilaNowTimestamp, monthLabel } from "@/lib/datetime";
import { readFlash } from "@/lib/flash";

type StatementMonth = {
  month: number;
  gross: number;
  operator: number;
  staffAgent: number;
  companyNet: number;
  expenses: number;
  netProfit: number;
};

/**
 * Income Statement — port of `car-rental/pages/admin/income.php`.
 *
 *   companyNet = gross - operator - staffAgent
 *   netProfit  = companyNet - expenses
 *
 * The data helper exposes `net`, which is `gross - operator - expenses`; the
 * legacy report subtracts the staff/agent share as well, so the monthly and
 * grand-total figures are recomputed here from the raw components.
 */
export const instant = false;

export default async function AdminIncomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const year = currentYear();
  const statement = await incomeStatement(session, year);

  const byMonth = new Map(statement.months.map((row) => [row.month, row]));
  const currentMonth = new Date(manilaNowTimestamp()).getUTCMonth() + 1;

  const rows: StatementMonth[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const data = byMonth.get(month);
    const gross = data?.gross ?? 0;

    // Legacy: show every month up to the current one, plus any month that has
    // gross revenue (so an imported / future month is never hidden).
    if (month > currentMonth && gross <= 0) continue;

    const operator = data?.operator ?? 0;
    const staffAgent = data?.staffAgent ?? 0;
    const expenses = data?.expenses ?? 0;
    const companyNet = gross - operator - staffAgent;

    rows.push({
      month,
      gross,
      operator,
      staffAgent,
      companyNet,
      expenses,
      netProfit: companyNet - expenses,
    });
  }

  const totalGross = statement.totals.gross;
  const totalOperator = statement.totals.operator;
  const totalStaffAgent = statement.totals.staffAgent;
  const totalExpenses = statement.totals.expenses;
  const totalCompanyNet = totalGross - totalOperator - totalStaffAgent;
  const totalProfit = totalCompanyNet - totalExpenses;
  const margin = totalGross > 0 ? (totalProfit / totalGross) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Income Statement"
        description={`Annual performance report for ${year}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <Link
              href="/admin/income/export"
              prefetch={false}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-green-700 bg-green-700 px-4 text-sm font-bold text-white transition-colors hover:bg-green-600 hover:text-white"
            >
              <FileSpreadsheet className="size-4" />
              Export Excel
            </Link>
          </div>
        }
      />

      <Flash {...flash} />

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <StatCard
          label="Total Gross Revenue"
          value={<Money value={totalGross} />}
          hint="All customer payments"
        />
        <StatCard
          label="Company Net"
          value={
            <span className="text-sky-700 dark:text-sky-300">
              <Money value={totalCompanyNet} />
            </span>
          }
          hint="After operator + staff payouts"
        />
        <StatCard
          label="Net Profit Margin"
          value={`${margin.toFixed(1)}%`}
          hint="Net Profit ÷ Gross"
          tone={margin >= 30 ? "success" : "warning"}
        />
      </div>

      {/* Income table */}
      <SectionCard className="mb-4" bodyClassName="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="pl-4 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Month
              </TableHead>
              <TableHead className="text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Gross Revenue
              </TableHead>
              <TableHead className="text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Operator Payouts
              </TableHead>
              <TableHead className="text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Staff / Agent
              </TableHead>
              <TableHead className="text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Company Net
              </TableHead>
              <TableHead className="text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Expenses
              </TableHead>
              <TableHead className="pr-4 text-right text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Net Profit
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month} className="transition-colors hover:bg-amber-500/10 dark:hover:bg-amber-400/10">
                <TableCell className="pl-4 font-bold text-foreground">
                  {monthLabel(row.month)}
                </TableCell>
                <TableCell className="text-right">
                  <Money value={row.gross} />
                </TableCell>
                <TableCell className="text-right text-amber-700 dark:text-amber-300">
                  {row.operator > 0 ? (
                    <span>
                      -<Money value={row.operator} />
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right text-violet-700 dark:text-violet-300">
                  {row.staffAgent > 0 ? (
                    <span>
                      -<Money value={row.staffAgent} />
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-sky-700 dark:text-sky-300">
                  <Money value={row.companyNet} />
                </TableCell>
                <TableCell className="text-right text-rose-700 dark:text-rose-400">
                  {row.expenses > 0 ? (
                    <span>
                      -<Money value={row.expenses} />
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell
                  className={
                    row.netProfit >= 0
                      ? "pr-4 text-right font-bold text-emerald-700 dark:text-emerald-400"
                      : "pr-4 text-right font-bold text-rose-700 dark:text-rose-400"
                  }
                >
                  <Money value={row.netProfit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow className="border-t-2 border-slate-950 bg-slate-900 hover:bg-slate-900">
              <TableCell className="pl-4 font-extrabold text-white">
                GRAND TOTAL
              </TableCell>
              <TableCell className="text-right font-extrabold text-white">
                <Money value={totalGross} />
              </TableCell>
              <TableCell className="text-right font-extrabold text-yellow-300">
                -<Money value={totalOperator} />
              </TableCell>
              <TableCell className="text-right font-extrabold text-violet-300">
                -<Money value={totalStaffAgent} />
              </TableCell>
              <TableCell className="text-right font-extrabold text-sky-300">
                <Money value={totalCompanyNet} />
              </TableCell>
              <TableCell className="text-right font-extrabold text-red-300">
                -<Money value={totalExpenses} />
              </TableCell>
              <TableCell className="pr-4 text-right text-base font-extrabold text-green-400">
                <Money value={totalProfit} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>

      {/* Legend / info panel */}
      <SectionCard bodyClassName="flex items-start gap-3 p-4 md:p-5">
        <Info className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-400" />
        <div className="text-xs leading-7 text-muted-foreground">
          <p className="font-extrabold text-foreground">Financial Breakdown</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              • <strong className="text-foreground">Gross Revenue</strong> =
              everything customers paid
            </li>
            <li>
              • <strong className="text-foreground">Operator Payouts</strong> =
              sum of operator shares (owed to operators)
            </li>
            <li>
              • <strong className="text-foreground">Staff / Agent</strong> =
              staff delivery + staff pickup + agent fees
            </li>
            <li>
              • <strong className="text-foreground">Company Net</strong> = Gross
              − Operator − Staff/Agent
            </li>
            <li>
              • <strong className="text-foreground">Expenses</strong> = company
              overhead (rent, salaries, etc.)
            </li>
            <li>
              • <strong className="text-foreground">Net Profit</strong> = Company
              Net − Expenses
            </li>
          </ul>
        </div>
      </SectionCard>
    </>
  );
}
