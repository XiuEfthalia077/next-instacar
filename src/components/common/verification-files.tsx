"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Eye, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type VerificationFileItem = {
  key: string;
  label: string;
  url?: string | null;
  hasFile?: boolean;
  isPdf?: boolean;
};

/**
 * Standardized Verification Files Pill Component.
 * - Mobile: 2-column balanced grid (grid grid-cols-2 gap-2)
 * - Desktop: Horizontal flex row (flex flex-row items-center gap-2)
 * - Standardized sizes: Same fixed height (h-9), width, and vertical centering
 * - Status Indicators: Green checkmark for uploaded, Red warning for missing
 * - Visual Cleanup: Subtle border, theme-aware neutral background with hover preview dialog
 */
export function VerificationFiles({
  files,
  className,
}: {
  files: VerificationFileItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-2",
        className,
      )}
    >
      {files.map((file) => {
        const isUploaded = Boolean(file.hasFile || file.url);
        const canPreview = Boolean(file.url);

        if (!isUploaded) {
          return (
            <div
              key={file.key}
              title={`${file.label}: Missing file`}
              className="group flex h-9 w-full sm:w-28 items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground/60 transition cursor-not-allowed select-none"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="size-3.5 shrink-0 opacity-40" />
                <span className="truncate text-[11px] font-bold">{file.label}</span>
              </div>
              <AlertCircle className="size-3.5 shrink-0 text-rose-500 opacity-80" />
            </div>
          );
        }

        if (!canPreview) {
          return (
            <div
              key={file.key}
              title={`${file.label}: Uploaded (processing preview)`}
              className="flex h-9 w-full sm:w-28 items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate text-[11px]">{file.label}</span>
              </div>
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            </div>
          );
        }

        return (
          <Dialog key={file.key}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group flex h-9 w-full sm:w-28 items-center justify-between rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-200/50 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 px-2.5 py-1 text-xs font-bold text-neutral-900 dark:text-neutral-100 transition shadow-xs hover:border-[#ffcc00] dark:hover:border-[#ffcc00] cursor-pointer"
                title={`Click to view ${file.label}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Eye className="size-3.5 shrink-0 text-[#b38a00] dark:text-[#ffcc00] group-hover:scale-110 transition-transform" />
                  <span className="truncate text-[11px]">{file.label}</span>
                </div>
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </button>
            </DialogTrigger>

            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-2xl p-6 sm:p-8">
              <DialogHeader className="border-b border-border/80 pb-3 pr-8 text-left">
                <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
                  <FileText className="size-4 text-[#ffcc00]" />
                  <span>{file.label} Preview</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official verification document on file.
                </DialogDescription>
              </DialogHeader>

              {file.isPdf || file.url?.toLowerCase().endsWith(".pdf") ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-8 sm:p-12 text-center">
                  <FileText className="size-10 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">
                    This document is a PDF file.
                  </p>
                  <a
                    href={file.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2 text-xs font-bold text-black hover:bg-[#ffd633] transition"
                  >
                    Open PDF in a new tab
                  </a>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-black/90 p-4 sm:p-6 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url || ""}
                    alt={file.label}
                    className="mx-auto max-h-[68vh] w-auto rounded-lg object-contain"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
}
