"use client";

import { CircleCheck, History, Trash2 } from "lucide-react";

import { ProofThumbnails, type ProofItem } from "@/components/admin/proof-viewer";
import { dateOnly, peso } from "@/components/admin/finance-format";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/common/loading-button";
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
import {
  deleteOperatorRemittanceAction,
  deleteStaffRemittanceAction,
} from "@/lib/actions/remittances";

/**
 * Payment history modal shared by the staff fee and operator remittance
 * screens (legacy `#historyModal` in `remittance.php` / `operator_revenue.php`).
 */

export type RemittanceHistoryItem = {
  id: number;
  amount: number;
  paymentDate: string | null;
  notes: string | null;
  recordedByName: string | null;
  proofs: ProofItem[];
};

export type RemittanceKind = "staff" | "operator";

function DeleteRemittanceDialog({
  kind,
  item,
}: {
  kind: RemittanceKind;
  item: RemittanceHistoryItem;
}) {
  const action =
    kind === "staff"
      ? deleteStaffRemittanceAction
      : deleteOperatorRemittanceAction;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          title="Delete this remittance"
          className="rounded-lg border-rose-200 text-rose-600 hover:border-rose-500 hover:bg-rose-500 hover:text-white dark:border-rose-900 dark:text-rose-400"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete remittance</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-md">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">Delete Remittance?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>You are about to permanently delete this payment record:</p>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/40">
                <p className="text-lg font-extrabold text-rose-700 dark:text-rose-300">
                  {peso(item.amount)}
                </p>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                  Paid on {dateOnly(item.paymentDate)}
                </p>
              </div>
              <p>
                <strong className="text-foreground">This cannot be undone.</strong>{" "}
                All attached proof files will also be deleted from the server.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          <input type="hidden" name="remittance_id" value={item.id} />

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              type="submit"
              variant="destructive"
              loadingText="Deleting..."
              className="rounded-lg px-4 font-bold"
            >
              <Trash2 className="size-4" />
              Delete Remittance
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemittanceHistoryDialog({
  kind,
  label,
  items,
}: {
  kind: RemittanceKind;
  label: string;
  items: RemittanceHistoryItem[];
}) {
  if (!items.length) return null;

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.65rem] border border-slate-300 bg-transparent px-4 py-2 text-[0.8rem] font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-[#3f3f46] dark:text-[#e2e8f0] dark:hover:bg-[#27272a] dark:hover:text-white"
        >
          <History className="size-4" />
          Payment History ({items.length})
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">Payment History</DialogTitle>
          <DialogDescription className="truncate">{label}</DialogDescription>
        </DialogHeader>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
          Recorded remittances
        </p>

        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold tabular-nums">{peso(item.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {dateOnly(item.paymentDate)} · Recorded by{" "}
                  {item.recordedByName || "Unknown"}
                </p>

                {item.notes ? (
                  <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                    {item.notes}
                  </p>
                ) : null}

                <ProofThumbnails proofs={item.proofs} />
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <CircleCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                <DeleteRemittanceDialog kind={kind} item={item} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-border pt-3">
          <p className="font-bold">Total paid</p>
          <p className="font-bold tabular-nums">{peso(total)}</p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-lg font-semibold">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
