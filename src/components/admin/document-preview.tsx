"use client";

import { Eye, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BookingDocument = {
  key: string;
  label: string;
  url: string;
  isPdf?: boolean;
};

/**
 * Preview button for a booking upload.
 *
 * The legacy pages opened the ID / billing / payment proof in a dark
 * SweetAlert lightbox (`.preview-existing-img`). The shadcn dialog keeps the
 * same purpose: images are previewed inline, PDFs open in a new tab.
 */
export function DocumentPreviewButton({
  document,
  compact = false,
  className,
}: {
  document: BookingDocument;
  compact?: boolean;
  className?: string;
}) {
  if (!document.url) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "xs" : "sm"}
          className={cn(
            "rounded-md border-border bg-card font-semibold text-muted-foreground shadow-none hover:bg-muted",
            compact && "px-2 text-[10px] uppercase tracking-wide",
            className,
          )}
        >
          <Eye className={compact ? "size-3" : "size-4"} />
          {document.label}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:max-w-3xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="size-4 text-[#b38a00] dark:text-[#ffd700]" />
            {document.label}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview of the uploaded {document.label.toLowerCase()} file.
          </DialogDescription>
        </DialogHeader>

        {document.isPdf ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
            <FileText className="size-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              This document is a PDF file.
            </p>
            <Button asChild variant="outline" className="rounded-lg font-bold">
              <a href={document.url} target="_blank" rel="noreferrer">
                Open PDF in a new tab
              </a>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={document.url}
              alt={document.label}
              className="mx-auto max-h-[70vh] w-auto object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
