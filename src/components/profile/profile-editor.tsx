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

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { LoadingButton } from "@/components/common/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteUserDocumentAction,
  updatePasswordAction,
  updateProfileInfoAction,
  updateUserDocumentsAction,
} from "@/lib/actions/profile";
import type { AppSession, User as UserType } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabType = "personal" | "documents" | "security";

export function ProfileEditor({
  session,
  user,
  returnTo = "/user/profile",
}: {
  session: AppSession;
  user?: UserType | null;
  returnTo?: string;
}) {
  const [activeTab, setActiveTab] = React.useState<TabType>("personal");

  // Security password state
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMismatchError, setPasswordMismatchError] = React.useState<string | null>(null);

  // Document replacement toggles
  const [replacePrimary, setReplacePrimary] = React.useState(false);
  const [replaceSecondary, setReplaceSecondary] = React.useState(false);
  const [replaceBilling, setReplaceBilling] = React.useState(false);

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

      {/* TAB 2: MY DOCUMENTS & HASSLE-FREE VERIFICATION (2 COLUMNS) */}
      {activeTab === "documents" && (
        <div className="w-full space-y-6">
          {/* Status Overview Card (Spans full width) */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    user?.id_verified
                      ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400"
                      : "bg-[#ffcc00]/20 text-[#b38a00] dark:text-[#ffcc00]",
                  )}
                >
                  <ShieldCheck className="size-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-foreground">
                      Document Verification
                    </h3>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                        user?.id_verified
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : hasPrimaryDoc
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {user?.id_verified
                        ? "Verified Driver"
                        : hasPrimaryDoc
                          ? "Under Review / Saved"
                          : "Action Required"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Upload your identification once. Verified documents automatically attach to your
                    bookings so you never have to re-upload.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Document Upload Form in 2-Column Responsive Grid */}
          <form action={updateUserDocumentsAction} className="space-y-6">
            <input type="hidden" name="return_to" value={returnTo} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
              {/* COLUMN 1: PRIMARY ID */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="size-4 text-[#ffcc00]" />
                      <span>Primary ID (e.g. Driver&apos;s License) *</span>
                    </Label>
                    {hasPrimaryDoc && (
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Saved on File
                      </span>
                    )}
                  </div>

                  {hasPrimaryDoc && !replacePrimary ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            Driver&apos;s License Active
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Stored in secure vault: {user?.primary_id_url?.split("/").pop()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplacePrimary(true)}
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="submit"
                          formAction={deleteUserDocumentAction}
                          name="doc_type"
                          value="primary"
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileUploadDropzone
                        name="primary_id"
                        accept="image/*,.pdf"
                        maxSizeMB={5}
                        helperText="Upload Driver's License or Government ID (JPG, PNG, WEBP, PDF up to 5MB)"
                      />
                      {hasPrimaryDoc && replacePrimary && (
                        <button
                          type="button"
                          onClick={() => setReplacePrimary(false)}
                          className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
                        >
                          Cancel replacement (Keep current ID)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2: SECONDARY ID */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="size-4 text-[#ffcc00]" />
                      <span>Secondary ID (Passport, UMID, Postal ID, etc.)</span>
                    </Label>
                    {hasSecondaryDoc && (
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Saved on File
                      </span>
                    )}
                  </div>

                  {hasSecondaryDoc && !replaceSecondary ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            Secondary Identification Active
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Stored in secure vault: {user?.secondary_id_url?.split("/").pop()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplaceSecondary(true)}
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="submit"
                          formAction={deleteUserDocumentAction}
                          name="doc_type"
                          value="secondary"
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileUploadDropzone
                        name="secondary_id"
                        accept="image/*,.pdf"
                        maxSizeMB={5}
                        helperText="Upload Secondary ID (Optional, max 5MB)"
                      />
                      {hasSecondaryDoc && replaceSecondary && (
                        <button
                          type="button"
                          onClick={() => setReplaceSecondary(false)}
                          className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
                        >
                          Cancel replacement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 1: PROOF OF BILLING */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="size-4 text-[#ffcc00]" />
                      <span>Proof of Billing (Electricity, Water, Internet, Bank)</span>
                    </Label>
                    {hasBillingDoc && (
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Saved on File
                      </span>
                    )}
                  </div>

                  {hasBillingDoc && !replaceBilling ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="size-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            Billing Document Active
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Stored in secure vault: {user?.proof_of_billing_url?.split("/").pop()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReplaceBilling(true)}
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="submit"
                          formAction={deleteUserDocumentAction}
                          name="doc_type"
                          value="billing"
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileUploadDropzone
                        name="proof_of_billing"
                        accept="image/*,.pdf"
                        maxSizeMB={5}
                        helperText="Upload Proof of Billing (Optional, max 5MB)"
                      />
                      {hasBillingDoc && replaceBilling && (
                        <button
                          type="button"
                          onClick={() => setReplaceBilling(false)}
                          className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
                        >
                          Cancel replacement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2: STRIPE PAYMENT INTEGRATION PREPARATION */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                    <CreditCard className="size-4.5 text-[#ffcc00]" />
                    <span>Saved Payment Method (Stripe Tokenized)</span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-extrabold text-foreground">
                        {user?.stripe_customer_id ? "Active Payment Vault" : "Instant 1-Click Ready"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {user?.stripe_customer_id
                        ? `Customer ID: ${user.stripe_customer_id}. Payment cards are tokenized via Stripe for 1-click checkout.`
                        : "Credit/debit card details are vaulted automatically through Stripe when you confirm your next booking. We never store raw card numbers."}
                    </p>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#ffcc00] shrink-0" />
                  <span>256-bit encrypted card vaulting powered by Stripe.</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar (Spans full width) */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                Documents saved here will automatically appear on all future car rental bookings.
              </p>
              <LoadingButton
                type="submit"
                className="h-12 rounded-xl bg-[#ffcc00] px-8 font-black text-black hover:bg-[#ffd633] transition shadow-xs text-sm"
              >
                <UploadCloud className="size-4.5 mr-2 stroke-[2.5]" />
                Save Documents to Profile
              </LoadingButton>
            </div>
          </form>
        </div>
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
