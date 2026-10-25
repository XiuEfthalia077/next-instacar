"use client";

import * as React from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#12141a] border-white/10 text-white sm:rounded-2xl">
        <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            {isPdf ? <FileText className="size-4 text-rose-400" /> : null}
            {title || fileName || "File Preview"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#ffcc00] hover:underline px-2 py-1 rounded-lg bg-white/5"
            >
              <ExternalLink className="size-3.5" />
              Open Original
            </a>
          </div>
        </DialogHeader>

        <div className="relative min-h-[300px] max-h-[75vh] overflow-auto flex items-center justify-center p-4 bg-black/40">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={title}
              className="w-full h-[65vh] rounded-lg border border-white/10 bg-white"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={title}
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl transition-transform duration-200"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
