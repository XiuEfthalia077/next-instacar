"use client";

import * as React from "react";
import { ExternalLink, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FileViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileUrl: string | null;
  fileName?: string;
}

export function FileViewModal({
  open,
  onOpenChange,
  title,
  fileUrl,
  fileName,
}: FileViewModalProps) {
  if (!fileUrl) return null;

  const isPdf =
    fileUrl.toLowerCase().includes(".pdf") ||
    (fileName && fileName.toLowerCase().endsWith(".pdf"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border text-card-foreground sm:rounded-2xl shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/80 bg-card flex flex-row items-center justify-between pr-16">
          <DialogTitle className="text-base font-extrabold flex items-center gap-2 truncate">
            {isPdf ? <FileText className="size-4 text-rose-400 shrink-0" /> : null}
            <span className="truncate">{title || fileName || "Vehicle Photo Preview"}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3.5 py-1.5 text-xs font-bold text-foreground transition-all hover:border-[#ffcc00] hover:text-[#b38a00] hover:bg-[#ffcc00]/10 active:scale-95"
            >
              <ExternalLink className="size-3.5 text-[#ffcc00]" />
              <span>Open Original</span>
            </a>
          </div>
        </DialogHeader>

        <div className="relative min-h-[320px] max-h-[75vh] overflow-auto flex items-center justify-center p-6 sm:p-10 bg-black/70">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={title}
              className="w-full h-[65vh] rounded-xl border border-border bg-white shadow-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={title}
              className="max-h-[68vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-border/50 transition-all duration-200"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
