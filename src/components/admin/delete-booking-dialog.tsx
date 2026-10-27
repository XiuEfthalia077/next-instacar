"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { LoadingButton } from "@/components/common/loading-button";
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
import { deleteBookingAction } from "@/lib/actions/bookings";

export interface DeleteBookingDialogProps {
  bookingId: number;
  redirectTo?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function DeleteBookingDialog({
  bookingId,
  redirectTo,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  className,
}: DeleteBookingDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            className={`gap-2 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm ${className ?? ""}`}
          >
            <Trash2 className="size-4" />
            Delete Booking
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="z-[201] rounded-2xl p-6 sm:p-7 max-w-md border-rose-500/30">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
            <AlertTriangle className="size-6" />
          </div>

          <DialogTitle className="text-center text-lg font-bold text-foreground">
            Delete Booking #BK-{bookingId}?
          </DialogTitle>

          <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
            Are you sure you want to permanently delete this booking? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs text-rose-800 dark:text-rose-300">
          <p className="font-bold flex items-center gap-1.5 mb-1">
            <Trash2 className="size-3.5 shrink-0" />
            Permanent Hard Deletion
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            This will completely remove the booking record, payment breakdown, customer remarks, and verification photos from the database.
          </p>
        </div>

        <form action={deleteBookingAction} className="mt-2">
          <input type="hidden" name="booking_id" value={bookingId} />
          {redirectTo ? <input type="hidden" name="redirect_to" value={redirectTo} /> : null}

          <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-4 font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>

            <LoadingButton
              type="submit"
              variant="destructive"
              className="rounded-xl bg-rose-600 px-5 font-bold text-white shadow-md hover:bg-rose-700"
            >
              Yes, Delete
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
