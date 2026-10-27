"use client";

import {
  CalendarDays,
  CircleDollarSign,
  History,
  PlusCircle,
  Receipt,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { EditExpenseDialog } from "@/components/admin/edit-expense-dialog";
import { Money } from "@/components/common/money";
import { ConfirmSubmit } from "@/components/shared/confirm-submit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addExpenseAction, deleteExpenseAction } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES, type ExpenseRecord } from "@/lib/types/expenses";
import { formatDate } from "@/lib/datetime";

interface ExpenseManagerProps {
  expenses: ExpenseRecord[];
  totalExpenses: number;
}

export function ExpenseManager({ expenses, totalExpenses }: ExpenseManagerProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="space-y-6">
      {/* ── 1. Manual Expense Input Form ── */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-[#ffcc00]">
              <Receipt className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Record Operating Expense</h3>
              <p className="text-xs text-muted-foreground">
                Input dynamic company expenses (e.g., branch rent, utility bills, car loans, maintenance).
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-[11px] px-2.5 py-1"
          >
            Deducts from Gross Profit
          </Badge>
        </div>

        <form
          ref={formRef}
          action={async (formData) => {
            await addExpenseAction(formData);
            formRef.current?.reset();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12"
        >
          {/* Expense Description */}
          <div className="lg:col-span-4 space-y-1.5">
            <Label htmlFor="expense-desc" className="text-xs font-bold text-foreground">
              Expense Name / Description <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="expense-desc"
              name="description"
              required
              placeholder="e.g. Rent for Main Branch, Electric Bill, Car Loan"
              className="h-10 text-xs font-semibold rounded-xl"
            />
          </div>

          {/* Amount (₱) */}
          <div className="lg:col-span-3 space-y-1.5">
            <Label htmlFor="expense-amount" className="text-xs font-bold text-foreground">
              Amount (₱) <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₱
              </span>
              <Input
                id="expense-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                className="h-10 rounded-xl pl-7 text-xs font-bold"
              />
            </div>
          </div>

          {/* Expense Date */}
          <div className="lg:col-span-2 space-y-1.5">
            <Label htmlFor="expense-date" className="text-xs font-bold text-foreground">
              Date <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="expense-date"
              name="expense_date"
              type="date"
              defaultValue={todayStr}
              required
              className="h-10 text-xs font-medium rounded-xl"
            />
          </div>

          {/* Category */}
          <div className="lg:col-span-3 space-y-1.5">
            <Label htmlFor="expense-category" className="text-xs font-bold text-foreground">
              Category
            </Label>
            <select
              id="expense-category"
              name="category"
              defaultValue="General Operations"
              className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-semibold text-foreground focus:border-[#ffcc00] focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2 lg:col-span-12 flex justify-end pt-1">
            <Button
              type="submit"
              className="h-10 gap-2 rounded-xl bg-[#ffcc00] px-5 text-xs font-extrabold text-black hover:bg-[#e6b800] transition"
            >
              <PlusCircle className="size-4" />
              <span>Record Expense</span>
            </Button>
          </div>
        </form>
      </div>

      {/* ── 2. Expense History Table ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <History className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Expense History ({expenses.length} recorded)
              </h3>
              <p className="text-xs text-muted-foreground">
                All operating deductions subtracted from Total Gross Profit to compute True Net Profit.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-muted-foreground block">
              Total Expenses
            </span>
            <span className="text-sm font-black text-rose-400">
              -<Money value={totalExpenses} />
            </span>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="py-10 text-center">
            <Receipt className="mx-auto size-9 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-bold text-foreground">No expenses recorded yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use the form above to record rent, electric bills, car loans, or other operating costs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="py-3 pl-5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="py-3 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Expense Name / Description
                  </TableHead>
                  <TableHead className="py-3 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Amount (₱)
                  </TableHead>
                  <TableHead className="py-3 pr-5 text-right text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="border-b border-border/60 transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-3 pl-5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-muted-foreground" />
                        <span>{formatDate(expense.expense_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs font-bold text-foreground">
                      {expense.description || "Unspecified expense"}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right text-xs font-extrabold text-rose-400">
                      -<Money value={expense.amount} />
                    </TableCell>
                    <TableCell className="py-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <EditExpenseDialog expense={expense} />
                        <form action={deleteExpenseAction}>
                          <input type="hidden" name="id" value={expense.id} />
                          <ConfirmSubmit
                            title="Delete Expense"
                            message={`Are you sure you want to delete "${expense.description || "this expense"}"? This will immediately restore ₱${expense.amount.toLocaleString()} to True Net Profit.`}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
                          >
                            <Trash2 className="size-3" />
                            <span>Delete</span>
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="border-t border-border bg-muted/30 font-bold">
                <TableRow>
                  <TableCell colSpan={3} className="py-3.5 pl-5 text-xs font-extrabold text-foreground">
                    Total Operating Expenses Sum
                  </TableCell>
                  <TableCell className="py-3.5 text-right text-sm font-black text-rose-400">
                    -<Money value={totalExpenses} />
                  </TableCell>
                  <TableCell className="pr-5" />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
