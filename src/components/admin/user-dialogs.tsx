"use client";

import { useId, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  ShieldCheck,
  Trash,
  UserPlus,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteUserAction,
  saveUserAction,
  toggleUserVerificationAction,
} from "@/lib/actions/users";
import { cn } from "@/lib/utils";

/**
 * Add / edit / delete dialogs for the admin user directory.
 *
 * The legacy page (`car-rental/pages/admin/users.php`) rendered a Bootstrap
 * modal per user and posted to `process/user_actions.php`; the same fields,
 * labels and copy are kept here with the shadcn dialog primitives.
 */

export type BranchOption = { id: number; name: string };

export type UserFormValues = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  branchId: number | null;
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function PasswordField({
  required = false,
  placeholder,
  hint,
}: {
  required?: boolean;
  placeholder: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-xs font-bold">
          Password
        </Label>
        {hint ? (
          <span className="text-[0.72rem] font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          name="password"
          required={required}
          placeholder={placeholder}
          autoComplete="new-password"
          className="rounded-lg pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function BranchField({
  branches,
  defaultValue,
}: {
  branches: BranchOption[];
  defaultValue?: number | null;
}) {
  const [value, setValue] = useState(
    defaultValue ? String(defaultValue) : "none",
  );
  const selectId = useId();

  return (
    <div>
      <Label htmlFor={selectId} className="mb-1 block text-xs font-bold">
        Branch
      </Label>
      <input
        type="hidden"
        name="branch_id"
        value={value === "none" ? "" : value}
      />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={selectId} className="w-full rounded-lg">
          <SelectValue placeholder="— No Branch —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— No Branch —</SelectItem>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={String(branch.id)}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AddUserDialog({
  role,
  branches,
}: {
  role: string;
  branches: BranchOption[];
}) {
  const roleLabel = capitalize(role);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2 font-bold">
          <UserPlus className="size-4" />
          Add New {roleLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">
            New {roleLabel}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new {role} account.
          </DialogDescription>
        </DialogHeader>

        <form action={saveUserAction} className="space-y-4">
          <input type="hidden" name="role" value={role} />

          <div>
            <Label htmlFor="new-user-name" className="mb-1 block text-xs font-bold">
              Full Name
            </Label>
            <Input
              id="new-user-name"
              type="text"
              name="name"
              placeholder="John Doe"
              required
              className="rounded-lg"
            />
          </div>

          <div>
            <Label htmlFor="new-user-email" className="mb-1 block text-xs font-bold">
              Email Address
            </Label>
            <Input
              id="new-user-email"
              type="email"
              name="email"
              placeholder="name@example.com"
              required
              className="rounded-lg"
            />
          </div>

          <PasswordField required placeholder="••••••••" />

          <div>
            <Label htmlFor="new-user-phone" className="mb-1 block text-xs font-bold">
              Phone Number
            </Label>
            <Input
              id="new-user-phone"
              type="text"
              name="phone"
              placeholder="09123456789"
              className="rounded-lg"
            />
          </div>

          <BranchField branches={branches} />

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-4 font-semibold"
              >
                Close
              </Button>
            </DialogClose>
            <LoadingButton type="submit" loadingText="Saving..." className="rounded-lg px-4 font-bold">
              Save Account
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  role,
  user,
  branches,
  trigger,
}: {
  role: string;
  user: UserFormValues;
  branches: BranchOption[];
  trigger?: React.ReactNode;
}) {
  const roleLabel = capitalize(role);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg border-border bg-slate-100 px-3 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">
            Edit {roleLabel}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update the account details of {user.name}.
          </DialogDescription>
        </DialogHeader>

        <form action={saveUserAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="role" value={role} />

          <div>
            <Label htmlFor={`edit-user-name-${user.id}`} className="mb-1 block text-xs font-bold">
              Full Name
            </Label>
            <Input
              id={`edit-user-name-${user.id}`}
              type="text"
              name="name"
              defaultValue={user.name}
              required
              className="rounded-lg"
            />
          </div>

          <div>
            <Label htmlFor={`edit-user-email-${user.id}`} className="mb-1 block text-xs font-bold">
              Email Address
            </Label>
            <Input
              id={`edit-user-email-${user.id}`}
              type="email"
              name="email"
              defaultValue={user.email}
              required
              className="rounded-lg"
            />
          </div>

          <div>
            <Label htmlFor={`edit-user-phone-${user.id}`} className="mb-1 block text-xs font-bold">
              Phone Number
            </Label>
            <Input
              id={`edit-user-phone-${user.id}`}
              type="text"
              name="phone"
              defaultValue={user.phone ?? ""}
              className="rounded-lg"
            />
          </div>

          <PasswordField
            placeholder="New password (optional)"
            hint="Leave blank to keep current"
          />

          <BranchField branches={branches} defaultValue={user.branchId} />

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
            <LoadingButton type="submit" loadingText="Updating..." className="rounded-lg px-4 font-bold">
              Update Account
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteUserDialog({
  role,
  user,
  trigger,
}: {
  role: string;
  user: { id: number; name: string };
  trigger?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "rounded-lg border-rose-200 px-3 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700",
              "dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40",
            )}
          >
            <Trash className="size-3.5" />
            Delete
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-8 sm:max-w-md">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="text-lg font-bold">Delete user?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user?{" "}
            <span className="font-semibold text-foreground">{user.name}</span>{" "}
            will lose access to the portal.
          </DialogDescription>
        </DialogHeader>

        <form action={deleteUserAction}>
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="role" value={role} />

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
            <LoadingButton
              type="submit"
              variant="destructive"
              loadingText="Deleting..."
              className="rounded-lg px-4 font-bold"
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* View Customer Documents & Verification Dialog                     */
/* ------------------------------------------------------------------ */

export type CustomerDocProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  id_verified?: boolean | null;
  primary_id_url?: string | null;
  secondary_id_url?: string | null;
  proof_of_billing_url?: string | null;
};

export function ViewCustomerDocumentsDialog({
  customer,
  returnTo,
}: {
  customer: CustomerDocProfile;
  returnTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const isVerified = Boolean(customer.id_verified);
  const hasPrimary = Boolean(customer.primary_id_url);
  const hasSecondary = Boolean(customer.secondary_id_url);
  const hasBilling = Boolean(customer.proof_of_billing_url);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            "h-8 gap-1.5 rounded-lg text-xs font-bold transition",
            isVerified
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              : hasPrimary
                ? "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                : "border-border text-muted-foreground",
          )}
        >
          <ShieldCheck className="size-3.5" />
          <span>{isVerified ? "Verified" : hasPrimary ? "Review ID" : "Documents"}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl p-6 sm:p-7 sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/70 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Customer Documents &amp; Verification
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {customer.name} ({customer.email})
              </DialogDescription>
            </div>
            <span
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-wider",
                isVerified
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : hasPrimary
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isVerified ? "Verified Driver" : hasPrimary ? "Pending Review" : "No ID On File"}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* 1. PRIMARY ID */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="size-4 text-[#ffcc00]" />
                <span>Primary ID (Driver&apos;s License)</span>
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  hasPrimary ? "text-emerald-500" : "text-muted-foreground",
                )}
              >
                {hasPrimary ? "Uploaded" : "Missing"}
              </span>
            </div>
            {hasPrimary ? (
              <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground flex items-center justify-between">
                <span className="truncate max-w-[280px] font-mono text-[11px]">
                  {customer.primary_id_url?.split("/").pop()}
                </span>
                <span className="text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00]">
                  Stored in Vault
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Customer has not uploaded a Primary ID.</p>
            )}
          </div>

          {/* 2. SECONDARY ID */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="size-4 text-[#ffcc00]" />
                <span>Secondary ID</span>
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  hasSecondary ? "text-emerald-500" : "text-muted-foreground",
                )}
              >
                {hasSecondary ? "Uploaded" : "Optional / None"}
              </span>
            </div>
            {hasSecondary ? (
              <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground flex items-center justify-between">
                <span className="truncate max-w-[280px] font-mono text-[11px]">
                  {customer.secondary_id_url?.split("/").pop()}
                </span>
                <span className="text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00]">
                  Stored in Vault
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No secondary ID on file.</p>
            )}
          </div>

          {/* 3. PROOF OF BILLING */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="size-4 text-[#ffcc00]" />
                <span>Proof of Billing</span>
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase",
                  hasBilling ? "text-emerald-500" : "text-muted-foreground",
                )}
              >
                {hasBilling ? "Uploaded" : "Optional / None"}
              </span>
            </div>
            {hasBilling ? (
              <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground flex items-center justify-between">
                <span className="truncate max-w-[280px] font-mono text-[11px]">
                  {customer.proof_of_billing_url?.split("/").pop()}
                </span>
                <span className="text-[11px] font-bold text-[#b38a00] dark:text-[#ffcc00]">
                  Stored in Vault
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No proof of billing on file.</p>
            )}
          </div>
        </div>

        {/* Verification Action Buttons */}
        <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border/70 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-xl text-xs font-semibold">
              Close
            </Button>
          </DialogClose>

          <form action={toggleUserVerificationAction} className="flex items-center gap-2">
            <input type="hidden" name="user_id" value={customer.id} />
            {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

            {isVerified ? (
              <>
                <input type="hidden" name="verified" value="false" />
                <LoadingButton
                  type="submit"
                  variant="outline"
                  className="rounded-xl border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-bold"
                >
                  Revoke Verification
                </LoadingButton>
              </>
            ) : (
              <>
                <input type="hidden" name="verified" value="true" />
                <LoadingButton
                  type="submit"
                  className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-black"
                >
                  <CheckCircle2 className="size-3.5 mr-1" />
                  Approve &amp; Verify Driver ID
                </LoadingButton>
              </>
            )}
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
