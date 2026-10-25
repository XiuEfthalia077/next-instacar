"use client";

import * as React from "react";
import { Eye, FileText, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileViewModal } from "@/components/common/file-view-modal";

interface FileUploadDropzoneProps {
  name: string;
  label?: string;
  description?: string;
  helperText?: string;
  maxSizeMB?: number;
  accept?: string;
  required?: boolean;
  multiple?: boolean;
  className?: string;
  existingUrl?: string | null;
  onFileSelect?: (file: File | null) => void;
}

export function FileUploadDropzone({
  name,
  label,
  description,
  helperText,
  maxSizeMB = 5,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  required = false,
  multiple = false,
  className,
  existingUrl = null,
  onFileSelect,
}: FileUploadDropzoneProps) {
  const displayDesc = helperText || description || `Drag & drop file here, or click to browse (Max ${maxSizeMB}MB)`;
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(existingUrl);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (existingUrl && !selectedFile) {
      setPreviewUrl(existingUrl);
    }
  }, [existingUrl, selectedFile]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(existingUrl);
      onFileSelect?.(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    setSelectedFile(file);
    onFileSelect?.(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
      if (inputRef.current) {
        inputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileSelect?.(null);
  };

  const fileName = selectedFile ? selectedFile.name : existingUrl ? existingUrl.split("/").pop() : "";

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{label}</span>
          {required ? <span className="text-[#ffcc00] font-normal">* Required</span> : null}
        </label>
      ) : null}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center cursor-pointer transition-all duration-200 ease-in-out",
          isDragOver
            ? "border-[#ffcc00] bg-[#ffcc00]/10 scale-[1.01]"
            : "border-border bg-card/60 hover:border-[#ffcc00]/50 hover:bg-muted/40",
          selectedFile || previewUrl ? "border-solid border-white/20 bg-muted/20" : "",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          required={required && !previewUrl}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileChange(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {selectedFile || previewUrl ? (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
                {previewUrl && !selectedFile?.type.includes("pdf") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-5 text-rose-400" />
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                  {fileName || "Attached file"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Stored document"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {previewUrl ? (
                <button
                  type="button"
                  onClick={() => setViewModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-[#ffcc00] hover:text-black px-2.5 py-1.5 text-xs font-semibold text-foreground transition"
                  title="View / Preview File"
                >
                  <Eye className="size-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={removeFile}
                className="inline-flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition"
                title="Remove file"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            <div className="size-10 rounded-full bg-[#ffcc00]/10 text-[#ffcc00] flex items-center justify-center mb-2">
              <UploadCloud className="size-5" />
            </div>
            <p className="text-xs font-bold text-foreground">
              Click or drag file to upload
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {displayDesc}
            </p>
          </div>
        )}
      </div>

      <FileViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        title={fileName || label || "Document Preview"}
        fileUrl={previewUrl}
        fileName={fileName}
      />
    </div>
  );
}
