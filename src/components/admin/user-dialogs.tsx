"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Pencil, Trash, UserPlus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteUserAction, saveUserAction } from "@/lib/actions/users";
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

      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
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
            <Button type="submit" className="rounded-lg px-4 font-bold">
              Save Account
            </Button>
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
}: {
  role: string;
  user: UserFormValues;
  branches: BranchOption[];
}) {
  const roleLabel = capitalize(role);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg border-border bg-slate-100 px-3 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80"
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
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
            <Button type="submit" className="rounded-lg px-4 font-bold">
              Update Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteUserDialog({
  role,
  user,
}: {
  role: string;
  user: { id: number; name: string };
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
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
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
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
            <Button
              type="submit"
              variant="destructive"
              className="rounded-lg px-4 font-bold"
            >
              Delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
