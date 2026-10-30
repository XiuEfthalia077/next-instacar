"use client";

import { CheckCircle2, CreditCard, DollarSign } from "lucide-react";
import * as React from "react";

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { LoadingButton } from "@/components/common/loading-button";
import { Money } from "@/components/common/money";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { payRemainingBalanceAction } from "@/lib/actions/bookings";

type PayBalanceDialogProps = {
  bookingId: number;
  remainingBalance: number;
  totalRental: number;
  alreadyPaid: number;
  customerName: string;
};

export function PayBalanceDialog({
  bookingId,
  remainingBalance,
  totalRental,
  alreadyPaid,
  customerName,
}: PayBalanceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<number>(remainingBalance);

  // Sync if balance changes
  React.useEffect(() => {
    setAmount(remainingBalance);
  }, [remainingBalance]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="w-full gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98]"
        >
          <CreditCard className="size-4" />
          Pay Remaining Balance
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-card text-card-foreground sm:rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-border/80 pb-4 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <DollarSign className="size-5 text-emerald-500" />
            Record Balance Payment (Booking #{bookingId})
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Accept cash or online payment to settle the customer&apos;s remaining balance.
          </DialogDescription>
        </DialogHeader>

        {/* Balance Overview Card */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-center text-xs">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">
              Total Rental
            </span>
            <p className="mt-0.5 font-bold text-foreground">
              <Money value={totalRental} />
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">
              Already Paid
            </span>
            <p className="mt-0.5 font-bold text-emerald-500">
              <Money value={alreadyPaid} />
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground">
              Balance Due
            </span>
            <p className="mt-0.5 font-bold text-rose-500">
              <Money value={remainingBalance} />
            </p>
          </div>
        </div>

        <form action={payRemainingBalanceAction} className="space-y-4 pt-2">
          <input type="hidden" name="booking_id" value={bookingId} />

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-xs font-bold text-foreground">
                Payment Amount (₱) *
              </Label>
              <button
                type="button"
                onClick={() => setAmount(remainingBalance)}
                className="text-[11px] font-bold text-[#ffcc00] hover:underline"
              >
                Pay Full Balance (₱{remainingBalance.toFixed(2)})
              </button>
            </div>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min={1}
              max={1000000}
              value={amount}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAmount(v > 1000000 ? 1000000 : v);
              }}
              required
              className="mt-1 text-base font-bold text-foreground"
            />
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="payment_method"
                className="text-xs font-bold text-foreground"
              >
                Payment Method *
              </Label>
              <select
                id="payment_method"
                name="payment_method"
                defaultValue="Cash"
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Bank Transfer">Bank Transfer (BDO/BPI)</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <Label
                htmlFor="reference_number"
                className="text-xs font-bold text-foreground"
              >
                Reference / Receipt #
              </Label>
              <Input
                id="reference_number"
                name="reference_number"
                placeholder="e.g. GCash Ref / OR#"
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs font-bold text-foreground">
              Payment Remarks / Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="e.g. Paid in cash at counter upon vehicle release"
              className="mt-1 text-xs"
            />
          </div>

          {/* Receipt Upload Dropzone */}
          <div>
            <Label className="mb-1 block text-xs font-bold text-foreground">
              Attach Payment Receipt / Proof (Optional)
            </Label>
            <FileUploadDropzone
              name="receipt_photo"
              accept="image/*,.pdf"
              maxSizeMB={5}
              helperText="Upload image or PDF of payment slip (max 5MB)."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/80 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              className="bg-emerald-600 font-bold text-white hover:bg-emerald-500"
            >
              <CheckCircle2 className="size-4" />
              Confirm Payment
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
