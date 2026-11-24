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

/**
 * Client-side image compressor.
 * Downscales large smartphone camera images (often 4-10MB) to ~200-400KB
 * with high fidelity before submitting via multipart/form-data.
 * This completely prevents HTTP 413 (Content Too Large) errors on Vercel.
 */
async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("svg")) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            const compressed = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
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
  const [selectedFiles, setSelectedFiles] = React.useState<{ file: File; preview: string | null }[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(existingUrl);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (existingUrl && !selectedFile) {
      setPreviewUrl(existingUrl);
    }
  }, [existingUrl, selectedFile]);

  const syncInputFiles = (files: File[]) => {
    if (inputRef.current && typeof DataTransfer !== "undefined") {
      try {
        const dt = new DataTransfer();
        for (const f of files) {
          dt.items.add(f);
        }
        inputRef.current.files = dt.files;
      } catch {
        // Fallback if browser restricts DataTransfer manipulation
      }
    }
  };

  const processSingleFile = async (file: File): Promise<File | null> => {
    let processedFile = file;
    if (file.type.startsWith("image/")) {
      try {
        processedFile = await compressImageFile(file);
      } catch (err) {
        console.warn("[FileUploadDropzone] Client compression fallback:", err);
      }
    }

    if (processedFile.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`"${file.name}" exceeds the ${maxSizeMB}MB limit.`);
      return null;
    }

    return processedFile;
  };

  const handleMultipleFiles = async (fileList: FileList | File[]) => {
    setUploadError(null);
    const incoming = Array.from(fileList);
    if (!incoming.length) return;

    const processedEntries: { file: File; preview: string | null }[] = [];
    for (const raw of incoming) {
      const processed = await processSingleFile(raw);
      if (processed) {
        const preview = processed.type.startsWith("image/")
          ? URL.createObjectURL(processed)
          : null;
        processedEntries.push({ file: processed, preview });
      }
    }

    if (!processedEntries.length) return;

    setSelectedFiles((prev) => {
      const next = [...prev, ...processedEntries];
      syncInputFiles(next.map((item) => item.file));
      return next;
    });
    onFileSelect?.(processedEntries[0]?.file ?? null);
  };

  const removeMultiFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      const next = prev.filter((_, i) => i !== index);
      syncInputFiles(next.map((item) => item.file));
      if (next.length === 0 && inputRef.current) {
        inputRef.current.value = "";
      }
      return next;
    });
  };

  const handleFileChange = async (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(existingUrl);
      onFileSelect?.(null);
      return;
    }

    const processedFile = await processSingleFile(file);
    if (!processedFile) return;

    setSelectedFile(processedFile);
    onFileSelect?.(processedFile);
    syncInputFiles([processedFile]);

    if (processedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(processedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple) {
        void handleMultipleFiles(e.dataTransfer.files);
      } else {
        void handleFileChange(e.dataTransfer.files[0]);
      }
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileSelect?.(null);
  };

  const fileName = selectedFile ? selectedFile.name : existingUrl ? existingUrl.split("/").pop() : "";
  const hasSelection = multiple ? selectedFiles.length > 0 : Boolean(selectedFile || previewUrl);

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
          hasSelection ? "border-solid border-border bg-muted/20" : "",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          required={required && !hasSelection}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              if (multiple) {
                void handleMultipleFiles(e.target.files);
              } else {
                void handleFileChange(e.target.files[0]);
              }
            }
          }}
          className="hidden"
        />

        {multiple && selectedFiles.length > 0 ? (
          <div className="w-full space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} ready to upload
              </span>
              <span className="text-[11px] font-semibold text-[#b38a00] dark:text-[#ffcc00]">
                + Click or drop to add more
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedFiles.map((item, idx) => (
                <div
                  key={`${item.file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/80 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 shrink-0 overflow-hidden rounded-md bg-muted border border-border flex items-center justify-center">
                      {item.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <FileText className="size-4 text-rose-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate max-w-[180px] sm:max-w-[240px]">
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => removeMultiFile(e, idx)}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Remove file"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : selectedFile || previewUrl ? (
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

      {uploadError ? (
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
          {uploadError}
        </p>
      ) : null}

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
