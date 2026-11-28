"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  KeyRound,
  Shield,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";
import * as React from "react";

import { LoadingButton } from "@/components/common/loading-button";
import { DocumentManagementDashboard } from "@/components/profile/document-management-dashboard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updatePasswordAction,
  updateProfileInfoAction,
} from "@/lib/actions/profile";
import type {
  AppSession,
  User as UserType,
  UserDocumentRevision,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type TabType = "personal" | "documents" | "security";

export function ProfileEditor({
  session,
  user,
  returnTo = "/user/profile",
  documentRevisions = [],
  initialTab = "personal",
}: {
  session: AppSession;
  user?: UserType | null;
  returnTo?: string;
  documentRevisions?: UserDocumentRevision[];
  initialTab?: TabType;
}) {
  const [activeTab, setActiveTab] = React.useState<TabType>(initialTab);

  // Security password state
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

  const hasPrimaryDoc = Boolean(user?.primary_id_url);
  const hasSecondaryDoc = Boolean(user?.secondary_id_url);
  const hasBillingDoc = Boolean(user?.proof_of_billing_url);

  // Document Verification is only for Customers/Users and Admins (Strictly hidden from Operators)
  const showDocuments = session.role !== "operator";

  return (
    <div className="space-y-6">
      {/* CONSOLIDATED TAB BAR */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer min-h-[44px]",
            activeTab === "personal"
              ? "bg-[#ffcc00] text-black shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:border-[#ffcc00]/50 hover:text-foreground",
          )}
        >
          <User className="size-4.5" />
          <span>Personal Info</span>
        </button>

        {showDocuments && (
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer min-h-[44px]",
              activeTab === "documents"
                ? "bg-[#ffcc00] text-black shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:border-[#ffcc00]/50 hover:text-foreground",
            )}
          >
            <FileCheck className="size-4.5" />
            <span>My Documents</span>
            {user?.id_verified ? (
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : hasPrimaryDoc ? (
              <span className="flex size-2 rounded-full bg-amber-500" />
            ) : null}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer min-h-[44px]",
            activeTab === "security"
              ? "bg-[#ffcc00] text-black shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:border-[#ffcc00]/50 hover:text-foreground",
          )}
        >
          <Shield className="size-4.5" />
          <span>Security</span>
        </button>
      </div>

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === "personal" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs w-full max-w-4xl">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00]">
              <User className="size-5.5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">Personal Information</h3>
              <p className="text-xs text-muted-foreground">Update your profile details and contact number.</p>
            </div>
          </div>

          <form action={updateProfileInfoAction} className="space-y-5">
            <input type="hidden" name="return_to" value={returnTo} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="prof_name" className="text-xs sm:text-sm font-bold text-foreground">
                  Full Name *
                </Label>
                <Input
                  id="prof_name"
                  name="name"
                  defaultValue={session.name || user?.name || ""}
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof_email" className="text-xs sm:text-sm font-bold text-foreground">
                  Email Address *
                </Label>
                <Input
                  id="prof_email"
                  name="email"
                  type="email"
                  defaultValue={session.email || user?.email || ""}
                  required
                  placeholder="user@gmail.com"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof_phone" className="text-xs sm:text-sm font-bold text-foreground">
                  Phone Number
                </Label>
                <Input
                  id="prof_phone"
                  name="phone"
                  defaultValue={user?.phone || ""}
                  placeholder="0917-xxx-xxxx"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof_role" className="text-xs sm:text-sm font-bold text-muted-foreground">
                  Account Role
                </Label>
                <Input
                  id="prof_role"
                  value={session.role.charAt(0).toUpperCase() + session.role.slice(1)}
                  disabled
                  className="h-11 rounded-xl bg-muted/40 cursor-not-allowed font-semibold text-muted-foreground text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Account role is managed by administrators.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <LoadingButton
                type="submit"
                className="h-11 rounded-xl bg-[#ffcc00] px-6 font-bold text-black hover:bg-[#ffd633] transition"
              >
                <Check className="size-4 mr-2 stroke-[2.5]" />
                Update Profile
              </LoadingButton>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MY DOCUMENTS & REVISION HISTORY */}
      {showDocuments && activeTab === "documents" && (
        <DocumentManagementDashboard
          accountStatus={
            user?.account_status ??
            (user?.id_verified ? "APPROVED" : "PENDING_VERIFICATION")
          }
          idVerified={Boolean(user?.id_verified)}
          revisions={documentRevisions}
          legacyUrls={{
            primary_id: user?.primary_id_url,
            secondary_id: user?.secondary_id_url,
            proof_of_billing: user?.proof_of_billing_url,
          }}
          returnTo={returnTo}
        />
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs max-w-2xl">
          <div className="flex items-center gap-3 border-b border-border/80 pb-4 mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00]">
              <Shield className="size-5.5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-foreground">Security Settings</h3>
              <p className="text-xs text-muted-foreground">Manage your login credentials and account security.</p>
            </div>
          </div>

          <form action={updatePasswordAction} onSubmit={handlePasswordSubmit} className="space-y-5">
            <input type="hidden" name="return_to" value={returnTo} />

            <div className="space-y-1.5">
              <Label htmlFor="sec_curr_pass" className="text-xs sm:text-sm font-bold text-foreground">
                Current Password *
              </Label>
              <Input
                id="sec_curr_pass"
                name="current_password"
                type="password"
                required
                placeholder="••••••••"
                className="h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec_new_pass" className="text-xs sm:text-sm font-bold text-foreground">
                New Password *
              </Label>
              <div className="relative">
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
                  className="h-11 rounded-xl text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec_conf_pass" className="text-xs sm:text-sm font-bold text-foreground">
                Confirm New Password *
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
                className="h-11 rounded-xl text-sm"
              />
            </div>

            {passwordMismatchError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-500">
                <AlertCircle className="size-4 shrink-0" />
                <span>{passwordMismatchError}</span>
              </div>
            )}

            <div className="pt-2">
              <LoadingButton
                type="submit"
                className="h-11 rounded-xl bg-[#ffcc00] px-6 font-bold text-black hover:bg-[#ffd633] transition"
              >
                <Check className="size-4 mr-2 stroke-[2.5]" />
                Change Password
              </LoadingButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
