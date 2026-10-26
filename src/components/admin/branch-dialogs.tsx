"use client";

import { PauseCircle, Pencil, PlayCircle, PlusCircle } from "lucide-react";

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
import { saveBranchAction, toggleBranchAction } from "@/lib/actions/users";
import { cn } from "@/lib/utils";

/**
 * Branch dialogs — the port of the add/edit Bootstrap modals and the
 * activate/deactivate confirm of `car-rental/pages/admin/branches.php`.
 */

export type BranchValues = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
};

function BranchFields({ branch }: { branch?: BranchValues }) {
  return (
    <>
      <div>
        <Label
          htmlFor={branch ? `branch-name-${branch.id}` : "branch-name"}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Branch Name
        </Label>
        <Input
          id={branch ? `branch-name-${branch.id}` : "branch-name"}
          type="text"
          name="name"
          defaultValue={branch?.name}
          placeholder="e.g. Cebu City"
          required
          className="rounded-lg"
        />
      </div>

      <div>
        <Label
          htmlFor={branch ? `branch-address-${branch.id}` : "branch-address"}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Address
        </Label>
        <Input
          id={branch ? `branch-address-${branch.id}` : "branch-address"}
          type="text"
          name="address"
          defaultValue={branch?.address ?? ""}
          placeholder="Full address"
          className="rounded-lg"
        />
      </div>

      <div>
        <Label
          htmlFor={branch ? `branch-phone-${branch.id}` : "branch-phone"}
          className="mb-1 block text-xs font-bold text-muted-foreground"
        >
          Phone
        </Label>
        <Input
          id={branch ? `branch-phone-${branch.id}` : "branch-phone"}
          type="text"
          name="phone"
          defaultValue={branch?.phone ?? ""}
          placeholder="Contact number"
          className="rounded-lg"
        />
      </div>
    </>
  );
}

export function NewBranchDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2 font-bold">
          <PlusCircle className="size-4" />
          New Branch
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <PlusCircle className="size-4 text-[#b38a00] dark:text-[#ffd700]" />
            New Branch
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new branch location.
          </DialogDescription>
        </DialogHeader>

        <form action={saveBranchAction} className="space-y-4">
          <input type="hidden" name="action" value="add" />

          <BranchFields />

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-4 font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-lg px-4 font-bold">
              Save Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditBranchDialog({ branch }: { branch: BranchValues }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border-[1.5px] border-border bg-slate-100 px-3 py-2 text-[0.8rem] font-bold text-slate-700 transition-all hover:-translate-y-px hover:border-slate-300 hover:bg-slate-200 hover:text-slate-900 hover:shadow-[0_4px_10px_rgba(15,23,42,0.08)] dark:border-[#3f3f46] dark:bg-[#27272a] dark:text-[#e2e8f0] dark:hover:border-[#52525b] dark:hover:bg-[#3f3f46] dark:hover:text-white"
        >
          <Pencil className="size-4" />
          Edit
        </button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="size-4 text-[#b38a00] dark:text-[#ffd700]" />
            Edit Branch
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update the details of {branch.name}.
          </DialogDescription>
        </DialogHeader>

        <form action={saveBranchAction} className="space-y-4">
          <input type="hidden" name="action" value="edit" />
          <input type="hidden" name="id" value={branch.id} />

          <BranchFields branch={branch} />

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-4 font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-lg px-4 font-bold">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BranchToggleDialog({
  branch,
}: {
  branch: { id: number; name: string; is_active: boolean };
}) {
  const deactivate = branch.is_active;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border-[1.5px] px-3 py-2 text-[0.8rem] font-bold transition-all hover:-translate-y-px",
            deactivate
              ? "border-amber-200 bg-amber-100 text-amber-800 hover:border-amber-500 hover:bg-amber-500 hover:text-white hover:shadow-[0_4px_12px_rgba(245,158,11,0.35)] dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-black"
              : "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white hover:shadow-[0_4px_12px_rgba(34,197,94,0.35)] dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500 dark:hover:text-black",
          )}
        >
          {deactivate ? (
            <PauseCircle className="size-4" />
          ) : (
            <PlayCircle className="size-4" />
          )}
          {deactivate ? "Deactivate" : "Activate"}
        </button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-md">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">
            {deactivate ? "Deactivate this branch?" : "Activate this branch?"}
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">
              {branch.name}
            </span>{" "}
            {deactivate
              ? "will be hidden from the branch pickers. Staff, cars, and bookings stay attached to it."
              : "will be available again in the branch pickers."}
          </DialogDescription>
        </DialogHeader>

        <form action={toggleBranchAction}>
          <input type="hidden" name="id" value={branch.id} />

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-4 font-semibold"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-lg px-4 font-bold">
              {deactivate ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
