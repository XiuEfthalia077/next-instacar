"use client";

import { Eye, FileText, QrCode, Trash2, Upload, UploadCloud } from "lucide-react";
import * as React from "react";

import { FileViewModal } from "@/components/common/file-view-modal";
import { LoadingButton } from "@/components/common/loading-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadQrCodeAction } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

interface CompanyQrCodeCardProps {
  initialQrUrl: string;
}

export function CompanyQrCodeCard({ initialQrUrl }: CompanyQrCodeCardProps) {
  const [stagedFile, setStagedFile] = React.useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [viewModalUrl, setViewModalUrl] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setStagedFile(null);
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
      setStagedPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    setStagedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setStagedPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const activeUrl = stagedPreviewUrl || (!imageError ? initialQrUrl : null);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/80 pb-4 mb-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#ffcc00]/15 text-[#ffcc00] ring-1 ring-[#ffcc00]/40">
            <QrCode className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground">Company Payment QR Code</h3>
            <p className="text-xs text-muted-foreground">
              Official GCash &amp; Maya QR image displayed during customer booking checkout.
            </p>
          </div>
        </div>

        {/* Current QR Preview Display Box */}
        <div className="mb-6 rounded-2xl border border-border/80 bg-black/40 p-5 text-center flex flex-col items-center justify-center">
          {activeUrl ? (
            <div className="group relative flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeUrl}
                alt="Active Payment QR"
                onError={() => setImageError(true)}
                className="max-h-52 w-auto rounded-xl object-contain shadow-lg ring-1 ring-border/60 transition-transform duration-200 group-hover:scale-105"
              />
              <p className="mt-3 text-xs font-semibold text-muted-foreground">
                {stagedFile ? "Newly Staged Preview" : "Active GCash / Maya QR Code"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <QrCode className="size-16 stroke-1 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-bold text-foreground">No QR Code Uploaded Yet</p>
              <p className="text-[11px] text-muted-foreground">
                Upload your payment QR image below to activate it for customer checkouts.
              </p>
            </div>
          )}

          {activeUrl && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewModalUrl(activeUrl)}
                className="h-8 rounded-xl px-3 text-xs font-bold border-border bg-muted/60 text-foreground hover:border-[#ffcc00] hover:text-[#b38a00]"
              >
                <Eye className="size-3.5 mr-1.5 text-[#ffcc00]" />
                Preview Full QR
              </Button>

              {stagedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileChange(null)}
                  className="h-8 rounded-xl px-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Discard Change
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Modern Upload Form */}
        <form action={uploadQrCodeAction} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            name="qr_code_image"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <Label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Upload New QR Code Image
          </Label>

          {/* Modern Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all",
              isDragOver
                ? "border-[#ffcc00] bg-[#ffcc00]/10 scale-[0.99]"
                : "border-border/80 bg-muted/20 hover:border-[#ffcc00]/70 hover:bg-muted/40",
            )}
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00]">
              <UploadCloud className="size-6" />
            </div>
            <p className="mt-2.5 text-xs font-extrabold text-foreground">
              {stagedFile ? stagedFile.name : (
                <>Drag &amp; drop payment QR here, or <span className="text-[#ffcc00] underline">browse</span></>
              )}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Supports PNG, JPG, or WEBP (Max 5MB)
            </p>
          </div>

          <LoadingButton
            type="submit"
            className="h-11 w-full rounded-xl bg-[#ffcc00] text-sm font-black text-black shadow-md transition-all hover:bg-[#ffd633] hover:scale-[1.01] active:scale-[0.99]"
          >
            <Upload className="size-4 mr-2" />
            Save &amp; Update QR
          </LoadingButton>
        </form>
      </div>

      {/* File Preview Modal */}
      <FileViewModal
        open={Boolean(viewModalUrl)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setViewModalUrl(null);
        }}
        fileUrl={viewModalUrl}
        title="Company Payment QR Preview"
      />
    </div>
  );
}
