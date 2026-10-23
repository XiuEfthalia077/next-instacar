"use client";

import { useState } from "react";
import { Banknote, CircleCheck } from "lucide-react";

import { peso } from "@/components/admin/finance-format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  recordOperatorRemittanceAction,
  recordStaffRemittanceAction,
} from "@/lib/actions/remittances";

/**
 * "Record Payment" modal shared by staff fee and operator remittances.
 *
 * Legacy behaviour kept:
 *   - the amount is pre-filled with the outstanding balance and clamped to it
 *   - the payment date defaults to today (Asia/Manila)
 *   - up to 5 optional JPG / PNG / PDF proofs, max 5 MB each
 *   - the server rejects anything above the outstanding balance
 */

export type RemittanceRecordDialogProps = {
  kind: "staff" | "operator";
  /** Branch id for staff fees, car id for operator remittances. */
  targetId: number;
  /** Branch name or car label shown in the modal header. */
  label: string;
  /** Operator name line (operator remittances only). */
  meta?: string | null;
  balance: number;
  /** `YYYY-MM-DD` in Asia/Manila, passed from the server page. */
  today: string;
};

/**
 * The form lives inside `DialogContent` on purpose: Radix unmounts the content
 * when the modal closes, so every reopen starts again from the outstanding
 * balance — the same reset the legacy shared modal did on `show.bs.modal`.
 */
function RecordForm({
  kind,
  targetId,
  label,
  meta,
  balance,
  today,
}: RemittanceRecordDialogProps) {
  const [amount, setAmount] = useState(() => balance.toFixed(2));

  const action =
    kind === "staff"
      ? recordStaffRemittanceAction
      : recordOperatorRemittanceAction;

  return (
    <form action={action} className="space-y-4">
      {kind === "staff" ? (
        <input type="hidden" name="branch_id" value={targetId} />
      ) : (
        <input type="hidden" name="car_id" value={targetId} />
      )}

      <div>
        <Label className="mb-1 block text-xs font-bold text-muted-foreground">
          Current Balance
        </Label>
        <p className="text-lg font-extrabold tabular-nums">{peso(balance)}</p>
        <p className="text-xs text-muted-foreground">
          {kind === "operator" && meta ? meta : label}
        </p>
      </div>

      <div>
        <Label
          htmlFor={`remit-amount-${kind}-${targetId}`}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Amount to Pay (₱)
        </Label>
        <Input
          id={`remit-amount-${kind}-${targetId}`}
          type="number"
          name="amount"
          step="0.01"
          min="0.01"
          max={balance.toFixed(2)}
          value={amount}
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value);
            if (Number.isFinite(next) && next > balance) {
              setAmount(balance.toFixed(2));
              return;
            }
            setAmount(event.target.value);
          }}
          required
          className="rounded-lg"
        />
      </div>

      <div>
        <Label
          htmlFor={`remit-date-${kind}-${targetId}`}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Payment Date
        </Label>
        <Input
          id={`remit-date-${kind}-${targetId}`}
          type="date"
          name="payment_date"
          defaultValue={today}
          required
          className="rounded-lg"
        />
      </div>

      <div>
        <Label
          htmlFor={`remit-proofs-${kind}-${targetId}`}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Proof of Payment{" "}
          <span className="font-normal lowercase text-muted-foreground">
            (optional, up to 5 files)
          </span>
        </Label>
        <Input
          id={`remit-proofs-${kind}-${targetId}`}
          type="file"
          name="proofs"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          className="rounded-lg"
        />
        <p className="mt-1 text-[0.72rem] text-muted-foreground">
          JPG, PNG, or PDF — max 5MB each.
          {kind === "operator" ? " e.g. GCash screenshot, receipt." : ""}
        </p>
      </div>

      <div>
        <Label
          htmlFor={`remit-notes-${kind}-${targetId}`}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Notes (optional)
        </Label>
        <Textarea
          id={`remit-notes-${kind}-${targetId}`}
          name="notes"
          rows={2}
          placeholder="e.g. GCash reference #, cash handed over..."
          className="rounded-lg"
        />
      </div>

      <DialogFooter className="gap-2 border-t border-border pt-4">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="rounded-lg bg-[#ffd700] px-4 font-bold text-black hover:bg-[#e6c200]"
        >
          <CircleCheck className="size-4" />
          Save Payment
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RemittanceRecordDialog({
  kind,
  targetId,
  label,
  meta,
  balance,
  today,
}: RemittanceRecordDialogProps) {
  const disabled = balance <= 0;

  const triggerClass =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.65rem] border border-[#ffd700] bg-[#ffd700] px-4 py-2 text-sm font-bold text-black transition-all hover:-translate-y-px hover:border-[#e6c200] hover:bg-[#e6c200] hover:shadow-[0_4px_12px_rgba(255,215,0,0.4)] disabled:pointer-events-none disabled:opacity-40";

  if (disabled) {
    return (
      <button type="button" disabled className={triggerClass}>
        <Banknote className="size-4" />
        Record Payment
      </button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={triggerClass}>
          <Banknote className="size-4" />
          Record Payment
        </button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Banknote className="size-4 text-[#b38a00] dark:text-[#ffd700]" />
            {kind === "staff" ? "Record Staff Payment" : "Record Remittance"}
          </DialogTitle>
          <DialogDescription className="truncate">{label}</DialogDescription>
        </DialogHeader>

        <RecordForm
          kind={kind}
          targetId={targetId}
          label={label}
          meta={meta}
          balance={balance}
          today={today}
        />
      </DialogContent>
    </Dialog>
  );
}
