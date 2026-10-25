"use client";

import { Check, Eye, EyeOff, KeyRound, Shield, User } from "lucide-react";
import * as React from "react";

import { LoadingButton } from "@/components/common/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePasswordAction, updateProfileInfoAction } from "@/lib/actions/profile";
import type { AppSession, User as UserType } from "@/lib/types";

export function ProfileEditor({
  session,
  user,
  returnTo = "/user/profile",
}: {
  session: AppSession;
  user?: UserType | null;
  returnTo?: string;
}) {
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMismatchError, setPasswordMismatchError] = React.useState<string | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (newPassword !== confirmPassword) {
      e.preventDefault();
      setPasswordMismatchError("New Password and Confirm New Password do not match.");
      return;
    }
    setPasswordMismatchError(null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. PERSONAL INFORMATION (Image 2) */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border/80 pb-4 mb-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <User className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground">Personal Information</h3>
          </div>
        </div>

        <form action={updateProfileInfoAction} className="space-y-4">
          <input type="hidden" name="return_to" value={returnTo} />

          <div>
            <Label htmlFor="prof_name" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>👤 Full Name</span>
            </Label>
            <Input
              id="prof_name"
              name="name"
              defaultValue={session.name || user?.name || ""}
              required
              placeholder="e.g. Juan Dela Cruz"
              className="mt-1 rounded-xl h-10"
            />
          </div>

          <div>
            <Label htmlFor="prof_email" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>✉ Email Address</span>
            </Label>
            <Input
              id="prof_email"
              name="email"
              type="email"
              defaultValue={session.email || user?.email || ""}
              required
              placeholder="user@gmail.com"
              className="mt-1 rounded-xl h-10"
            />
          </div>

          <div>
            <Label htmlFor="prof_phone" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>📞 Phone Number</span>
            </Label>
            <Input
              id="prof_phone"
              name="phone"
              defaultValue={user?.phone || ""}
              placeholder="09xxxxxxxxx"
              className="mt-1 rounded-xl h-10"
            />
          </div>

          <div>
            <Label htmlFor="prof_role" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>📍 Account Role</span>
            </Label>
            <Input
              id="prof_role"
              value={session.role.charAt(0).toUpperCase() + session.role.slice(1)}
              disabled
              className="mt-1 rounded-xl h-10 bg-muted/40 cursor-not-allowed font-semibold text-muted-foreground"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Role cannot be changed by the user.
            </p>
          </div>

          <div className="pt-2">
            <LoadingButton
              type="submit"
              className="rounded-xl bg-[#ffcc00] px-5 py-2.5 font-bold text-black hover:bg-[#ffd633] transition"
            >
              <Check className="size-4 mr-1.5" />
              Update Info
            </LoadingButton>
          </div>
        </form>
      </div>

      {/* 2. SECURITY & PASSWORD (Image 2) */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border/80 pb-4 mb-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-[#ffcc00]">
            <Shield className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground">Security</h3>
          </div>
        </div>

        <form action={updatePasswordAction} onSubmit={handlePasswordSubmit} className="space-y-4">
          <input type="hidden" name="return_to" value={returnTo} />

          {/* Current Password */}
          <div>
            <Label htmlFor="sec_curr_pass" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>🔑 Current Password</span>
            </Label>
            <Input
              id="sec_curr_pass"
              name="current_password"
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 rounded-xl h-10"
            />
          </div>

          {/* New Password WITH EYE ICON */}
          <div>
            <Label htmlFor="sec_new_pass" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>🔑 New Password</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="sec_new_pass"
                name="new_password"
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordMismatchError) setPasswordMismatchError(null);
                }}
                placeholder="At least 6 characters"
                className="rounded-xl h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password WITHOUT EYE ICON (Strictly required) */}
          <div>
            <Label htmlFor="sec_conf_pass" className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span>🔑 Confirm New Password</span>
            </Label>
            <Input
              id="sec_conf_pass"
              name="confirm_password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordMismatchError) setPasswordMismatchError(null);
              }}
              placeholder="Re-enter new password"
              className="mt-1 rounded-xl h-10"
            />
          </div>

          {/* Validation error message */}
          {passwordMismatchError ? (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs font-bold text-rose-500">
              {passwordMismatchError}
            </div>
          ) : null}

          <div className="pt-2">
            <LoadingButton
              type="submit"
              className="rounded-xl bg-[#ffcc00] px-5 py-2.5 font-bold text-black hover:bg-[#ffd633] transition"
            >
              <Check className="size-4 mr-1.5" />
              Change Password
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
