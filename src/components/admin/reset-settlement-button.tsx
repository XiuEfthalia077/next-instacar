"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

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
import { resetSettlementAction } from "@/lib/actions/bookings";
import { cn } from "@/lib/utils";

/**
 * "Resettle" action of the settlement history table
 * (legacy `process/reset_settlement.php` confirm dialog).
 */
export function ResetSettlementButton({
  bookingId,
  label,
  fullWidth = false,
}: {
  bookingId: number;
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-[0.78rem] font-bold text-rose-700 transition-all hover:-translate-y-px hover:border-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-[0_4px_12px_rgba(244,63,94,0.35)] dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-500 dark:hover:text-white",
            fullWidth && "w-full",
          )}
        >
          <RotateCcw className="size-4" />
          <span>Resettle</span>
        </button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <TriangleAlert className="size-5 text-rose-600" />
            Reset this settlement?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">{label}</p>
              <p>
                The existing record will be deleted and the booking will return
                to Pending so you can re-enter the fees.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form action={resetSettlementAction}>
          <input type="hidden" name="booking_id" value={bookingId} />

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="rounded-lg px-4 font-bold">
              <RotateCcw className="size-4" />
              Reset Settlement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
