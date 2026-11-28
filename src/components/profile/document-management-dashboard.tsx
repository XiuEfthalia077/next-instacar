"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Phone,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import * as React from "react";

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { LoadingButton } from "@/components/common/loading-button";
import { reuploadUserDocumentAction } from "@/lib/actions/profile";
import type {
  AccountVerificationStatus,
  DocumentReviewStatus,
  UserDocumentRevision,
  UserDocumentType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type DocumentSlotConfig = {
  type: UserDocumentType;
  title: string;
  subtitle: string;
  legacyUrl?: string | null;
};

type DocumentManagementDashboardProps = {
  accountStatus: AccountVerificationStatus;
  idVerified: boolean;
  revisions: UserDocumentRevision[];
  legacyUrls: {
    primary_id?: string | null;
    secondary_id?: string | null;
    proof_of_billing?: string | null;
  };
  returnTo?: string;
};

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: DocumentReviewStatus | "MISSING" }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="size-3" />
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
        <AlertTriangle className="size-3" />
        Rejected / For Replacement
      </span>
    );
  }
  if (status === "PENDING_REVIEW") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
        <Clock className="size-3" />
        Pending Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      Not Uploaded
    </span>
  );
}

export function DocumentManagementDashboard({
  accountStatus,
  idVerified,
  revisions,
  legacyUrls,
  returnTo = "/user/profile",
}: DocumentManagementDashboardProps) {
  const [openUploadFor, setOpenUploadFor] = React.useState<UserDocumentType | null>(null);

  const isApproved = accountStatus === "APPROVED" || idVerified;

  const slots: DocumentSlotConfig[] = [
    {
      type: "primary_id",
      title: "Valid ID 1 (Primary ID)",
      subtitle: "Driver's License or Government-issued ID",
      legacyUrl: legacyUrls.primary_id,
    },
    {
      type: "secondary_id",
      title: "Valid ID 2 (Secondary ID)",
      subtitle: "Passport, UMID, National ID, Postal ID, etc.",
      legacyUrl: legacyUrls.secondary_id,
    },
    {
      type: "proof_of_billing",
      title: "Proof of Billing",
      subtitle: "Utility bill, Internet, or Bank statement under your name",
      legacyUrl: legacyUrls.proof_of_billing,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Account Verification Status Banner */}
      {isApproved ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  Account Verified &amp; Approved
                </h3>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Approved
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Your identity documents have been verified by InstaCar. You can book vehicles without re-uploading your IDs or proof of billing.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Clock className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  Pending Verification
                </h3>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  {accountStatus === "REJECTED" ? "Action Required" : "Pending Review"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                Your account registration and verification documents have been successfully submitted and are now pending review by InstaCar. For faster account verification, please contact us:
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-[#ffcc00]">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-background/80 px-2.5 py-1">
                  <Phone className="size-3.5" />
                  0991 590 7335 / 0917 554 0394
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Document Cards */}
      <div className="space-y-4">
        {slots.map((slot) => {
          const docRevs = revisions
            .filter((r) => r.doc_type === slot.type)
            .sort((a, b) => b.version - a.version);

          const current = docRevs.find((r) => r.is_current) ?? docRevs[0] ?? null;
          const history = current ? docRevs.filter((r) => r.id !== current.id) : [];

          const effectiveStatus: DocumentReviewStatus | "MISSING" = current
            ? current.status
            : slot.legacyUrl
              ? isApproved
                ? "APPROVED"
                : "PENDING_REVIEW"
              : "MISSING";

          const effectiveFileName =
            current?.file_name ||
            (slot.legacyUrl ? slot.legacyUrl.split("/").pop() : null);

          const isUploadingThis = openUploadFor === slot.type || effectiveStatus === "MISSING";
          const isRejected = effectiveStatus === "REJECTED";

          return (
            <div
              key={slot.type}
              className={cn(
                "rounded-2xl border bg-card p-4 sm:p-5 shadow-xs transition-colors space-y-3.5",
                isRejected
                  ? "border-rose-500/60 ring-1 ring-rose-500/20"
                  : "border-border/80",
              )}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-[#b38a00] dark:text-[#ffcc00]">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-foreground">
                      {slot.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">{slot.subtitle}</p>
                    {effectiveFileName ? (
                      <p className="mt-1 text-[11px] font-medium text-muted-foreground truncate">
                        File: <span className="font-semibold text-foreground">{effectiveFileName}</span>
                        {current?.uploaded_at ? ` • Uploaded: ${formatTimestamp(current.uploaded_at)}` : ""}
                        {current ? ` (v${current.version})` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                <StatusPill status={effectiveStatus} />
              </div>

              {/* Admin Rejection Remarks Callout */}
              {isRejected && current?.admin_remarks ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs">
                  <p className="font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 text-[10px]">
                    Admin Remark
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground leading-relaxed">
                    {current.admin_remarks}
                  </p>
                </div>
              ) : null}

              {/* Action Button / Inline Re-upload Form */}
              {isUploadingThis ? (
                <form
                  action={reuploadUserDocumentAction}
                  encType="multipart/form-data"
                  className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3.5"
                >
                  <input type="hidden" name="doc_type" value={slot.type} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <FileUploadDropzone
                    name="document_file"
                    accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                    maxSizeMB={5}
                    required
                    helperText="Upload a clear JPG, PNG, WEBP, or PDF copy (max 5MB). Previous versions are kept for audit."
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {effectiveStatus !== "MISSING" ? (
                      <button
                        type="button"
                        onClick={() => setOpenUploadFor(null)}
                        className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    ) : null}
                    <LoadingButton
                      type="submit"
                      className="gap-1.5 rounded-xl bg-[#ffcc00] px-4 py-2 text-xs font-extrabold text-black hover:bg-[#ffd633]"
                    >
                      <UploadCloud className="size-3.5" />
                      {effectiveStatus === "MISSING" ? "Upload Document" : "Submit Replacement"}
                    </LoadingButton>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpenUploadFor(slot.type)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer",
                      isRejected
                        ? "w-full sm:w-auto justify-center bg-[#ffcc00] text-black shadow-xs hover:bg-[#ffd633]"
                        : "border border-border bg-background text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00]",
                    )}
                  >
                    <RefreshCw className="size-3.5" />
                    Replace / Re-upload
                  </button>
                </div>
              )}

              {/* Revision History (Old rejected/superseded files preserved for audit) */}
              {history.length > 0 ? (
                <details className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2 text-xs">
                  <summary className="flex cursor-pointer items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground select-none">
                    <History className="size-3.5 text-[#b38a00] dark:text-[#ffcc00]" />
                    Revision History ({history.length} previous version{history.length > 1 ? "s" : ""})
                  </summary>
                  <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2.5">
                    {history.map((rev) => (
                      <div
                        key={rev.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            v{rev.version} — {rev.file_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Uploaded: {formatTimestamp(rev.uploaded_at)}
                          </p>
                          {rev.admin_remarks ? (
                            <p className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                              Remark: {rev.admin_remarks}
                            </p>
                          ) : null}
                        </div>
                        <StatusPill status={rev.status} />
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
