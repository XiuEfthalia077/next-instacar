"use client";

import { Edit3, Receipt } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/common/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editExpenseAction } from "@/lib/actions/expenses";
import { EXPENSE_CATEGORIES, type ExpenseRecord } from "@/lib/types/expenses";

interface EditExpenseDialogProps {
  expense: ExpenseRecord;
}

export function EditExpenseDialog({ expense }: EditExpenseDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:text-[#ffcc00]"
        >
          <Edit3 className="size-3.5" />
          <span>Edit</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-border bg-card text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#ffcc00]/15 text-[#ffcc00]">
              <Receipt className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold">Edit Recorded Expense</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update details for this operational expense entry.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form action={editExpenseAction} onSubmit={() => setOpen(false)} className="space-y-4 pt-2">
          <input type="hidden" name="id" value={expense.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-desc-${expense.id}`} className="text-xs font-bold">
              Expense Name / Description <span className="text-rose-500">*</span>
            </Label>
            <Input
              id={`edit-desc-${expense.id}`}
              name="description"
              defaultValue={expense.description ?? ""}
              placeholder="e.g. Rent for Main Branch, Electric Bill, Car Loan"
              required
              className="text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-amount-${expense.id}`} className="text-xs font-bold">
                Amount (₱) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id={`edit-amount-${expense.id}`}
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={expense.amount}
                placeholder="0.00"
                required
                className="text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-date-${expense.id}`} className="text-xs font-bold">
                Expense Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                id={`edit-date-${expense.id}`}
                name="expense_date"
                type="date"
                defaultValue={expense.expense_date}
                required
                className="text-xs font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-category-${expense.id}`} className="text-xs font-bold">
              Category
            </Label>
            <select
              id={`edit-category-${expense.id}`}
              name="category"
              defaultValue={expense.category}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground focus:border-[#ffcc00] focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              size="sm"
              loadingText="Saving..."
              className="bg-[#ffcc00] text-black font-extrabold hover:bg-[#e6b800] text-xs"
            >
              Save Changes
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
