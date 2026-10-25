"use client";

import { Eye, FileText } from "lucide-react";
import * as React from "react";

import { FileViewModal } from "@/components/common/file-view-modal";
import { Button } from "@/components/ui/button";

export type ViewableDoc = {
  id?: string | number;
  label: string;
  url: string;
  fileName?: string;
};

export function BookingDocumentButton({
  label,
  url,
  fileName,
}: {
  label: string;
  url: string;
  fileName?: string;
}) {
  const [open, setOpen] = React.useState(false);

  if (!url) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 rounded-xl border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
      >
        <Eye className="size-3.5" />
        <span>{label}</span>
      </Button>

      <FileViewModal
        open={open}
        onOpenChange={setOpen}
        title={label}
        fileUrl={url}
        fileName={fileName}
      />
    </>
  );
}

export function BookingPhotoThumbnail({
  url,
  fileName,
  canDelete,
  deleteForm,
}: {
  url: string;
  fileName: string;
  canDelete?: boolean;
  deleteForm?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const isPdf = /\.pdf$/i.test(fileName);

  return (
    <>
      <div className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-black/40 shadow-sm transition hover:scale-105 hover:border-[#ffcc00]">
        {deleteForm}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-full items-center justify-center p-2 text-center"
          title={`Click to view ${fileName}`}
        >
          {isPdf ? (
            <div className="flex flex-col items-center gap-1 text-rose-400">
              <FileText className="size-8" />
              <span className="max-w-[70px] truncate text-[9px] font-semibold text-foreground">
                {fileName}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={fileName}
              className="size-full object-cover transition duration-200 group-hover:scale-110"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            <Eye className="size-5 text-white" />
          </div>
        </button>
      </div>

      <FileViewModal
        open={open}
        onOpenChange={setOpen}
        title={fileName}
        fileUrl={url}
        fileName={fileName}
      />
    </>
  );
}
