"use client";

import {
  Check,
  Eye,
  Image as ImageIcon,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import * as React from "react";

import { FileViewModal } from "@/components/common/file-view-modal";
import { carImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type VehicleMediaStashProps = {
  existingImages?: string[];
  maxSizeMB?: number;
};

type StagedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

export function VehicleMediaStash({
  existingImages = [],
  maxSizeMB = 5,
}: VehicleMediaStashProps) {
  // Existing images from DB (excluding default.png)
  const initialExisting = React.useMemo(() => {
    return existingImages.filter((img) => Boolean(img) && img !== "default.png");
  }, [existingImages]);

  const [markedToDelete, setMarkedToDelete] = React.useState<string[]>([]);
  const [stagedFiles, setStagedFiles] = React.useState<StagedFile[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [viewModalUrl, setViewModalUrl] = React.useState<string | null>(null);

  // The identifier of the main photo (either an existing filename or a staged file's name/id)
  const [mainPhotoKey, setMainPhotoKey] = React.useState<string>(() => {
    return initialExisting.length > 0 ? initialExisting[0] : "";
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync stagedFiles to the native file input using DataTransfer
  const syncFileInput = (files: StagedFile[]) => {
    if (!fileInputRef.current) return;
    try {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f.file));
      fileInputRef.current.files = dt.files;
    } catch {
      // Fallback for environments where DataTransfer constructor isn't available
    }
  };

  const handleAddFiles = (incomingFiles: FileList | File[]) => {
    const validFiles: StagedFile[] = [];
    const limitBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      if (!file.type.startsWith("image/")) {
        alert(`File "${file.name}" is not an image.`);
        continue;
      }
      if (file.size > limitBytes) {
        alert(`File "${file.name}" exceeds the ${maxSizeMB}MB limit.`);
        continue;
      }

      validFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (validFiles.length === 0) return;

    setStagedFiles((prev) => {
      const next = [...prev, ...validFiles];
      syncFileInput(next);

      // If no main photo currently selected (or previous main was deleted), set to first available
      if (!mainPhotoKey) {
        setMainPhotoKey(validFiles[0].file.name);
      }
      return next;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveStaged = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const next = prev.filter((item) => item.id !== id);
      syncFileInput(next);

      // If removed item was main photo, re-assign main photo
      if (target && mainPhotoKey === target.file.name) {
        if (next.length > 0) {
          setMainPhotoKey(next[0].file.name);
        } else {
          const remainingExisting = initialExisting.filter(
            (img) => !markedToDelete.includes(img),
          );
          setMainPhotoKey(remainingExisting[0] || "");
        }
      }
      return next;
    });
  };

  const toggleDeleteExisting = (img: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMarkedToDelete((prev) => {
      const willDelete = !prev.includes(img);
      const next = willDelete ? [...prev, img] : prev.filter((i) => i !== img);

      // If the main photo is being marked for deletion, switch main photo
      if (willDelete && mainPhotoKey === img) {
        const remainingExisting = initialExisting.filter((i) => !next.includes(i));
        if (remainingExisting.length > 0) {
          setMainPhotoKey(remainingExisting[0]);
        } else if (stagedFiles.length > 0) {
          setMainPhotoKey(stagedFiles[0].file.name);
        } else {
          setMainPhotoKey("");
        }
      }
      return next;
    });
  };

  const activeExisting = initialExisting.filter((img) => !markedToDelete.includes(img));
  const totalCount = activeExisting.length + stagedFiles.length;

  // Set default main photo if none set yet
  React.useEffect(() => {
    if (!mainPhotoKey) {
      if (activeExisting.length > 0) {
        setMainPhotoKey(activeExisting[0]);
      } else if (stagedFiles.length > 0) {
        setMainPhotoKey(stagedFiles[0].file.name);
      }
    }
  }, [mainPhotoKey, activeExisting, stagedFiles]);

  return (
    <div className="space-y-3">
      {/* Hidden file input for form submission */}
      <input
        ref={fileInputRef}
        type="file"
        name="car_images"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleAddFiles(e.target.files);
          }
        }}
      />

      {/* Hidden main photo identifier sent to server */}
      <input type="hidden" name="main_photo_name" value={mainPhotoKey} />

      {/* Header with Photo Counter */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-foreground">
            Vehicle Media Upload Stash
          </span>
          <p className="text-[11px] text-muted-foreground">
            Upload multiple views. Click ⭐ on any image to set it as the Main Photo thumbnail.
          </p>
        </div>
        <span className="rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[11px] font-extrabold text-black">
          {totalCount} {totalCount === 1 ? "Photo" : "Photos"}
        </span>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition",
          isDragOver
            ? "border-[#ffcc00] bg-[#ffcc00]/10"
            : "border-border/80 bg-muted/20 hover:border-[#ffcc00]/60 hover:bg-muted/40",
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-[#ffcc00]/15 text-[#ffcc00]">
          <UploadCloud className="size-5" />
        </div>
        <p className="mt-2 text-xs font-bold text-foreground">
          Drag &amp; drop vehicle photos here, or <span className="text-[#ffcc00] underline">browse</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Supports JPEG, PNG, WEBP (Max {maxSizeMB}MB each)
        </p>
      </div>

      {/* Photo Preview Grid (Existing + Staged) */}
      {totalCount > 0 || markedToDelete.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">
              Staged Photos ({totalCount})
            </span>
            <span className="text-[11px] text-muted-foreground">
              {mainPhotoKey ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  Main thumbnail designated
                </span>
              ) : (
                "Please designate a main photo"
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {/* 1. Existing Photos */}
            {initialExisting.map((img) => {
              const isMarked = markedToDelete.includes(img);
              const isMain = !isMarked && mainPhotoKey === img;
              const url = carImageUrl(img);

              return (
                <div
                  key={img}
                  className={cn(
                    "group relative aspect-video overflow-hidden rounded-xl border-2 transition",
                    isMarked
                      ? "border-rose-500/80 opacity-40 ring-1 ring-rose-500"
                      : isMain
                        ? "border-[#ffcc00] shadow-md ring-2 ring-[#ffcc00]/60"
                        : "border-border bg-muted/40 hover:border-[#ffcc00]/60",
                  )}
                >
                  {isMarked ? (
                    <input
                      type="hidden"
                      name="delete_existing_images"
                      value={img}
                    />
                  ) : null}

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Vehicle photo"
                    className="size-full object-cover"
                  />

                  {/* Main Photo Badge / Selector */}
                  {!isMarked && (
                    <div className="absolute left-1.5 top-1.5 z-10">
                      {isMain ? (
                        <span className="flex items-center gap-1 rounded-md bg-[#ffcc00] px-1.5 py-0.5 text-[9px] font-black text-black shadow-sm">
                          <Star className="size-2.5 fill-black text-black" />
                          Main Photo
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMainPhotoKey(img);
                          }}
                          className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-[#ffcc00] hover:text-black"
                          title="Set as Main Thumbnail"
                        >
                          <Star className="size-2.5" />
                          Set Main
                        </button>
                      )}
                    </div>
                  )}

                  {/* Quick Action Buttons (View + Delete) */}
                  <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                    {!isMarked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewModalUrl(url);
                        }}
                        className="rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/90"
                        title="Preview"
                      >
                        <Eye className="size-3" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => toggleDeleteExisting(img, e)}
                      className={cn(
                        "rounded p-1 transition",
                        isMarked
                          ? "bg-rose-600 text-white"
                          : "bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600",
                      )}
                      title={isMarked ? "Keep photo" : "Delete photo"}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  {isMarked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/80 text-[10px] font-bold text-rose-300">
                      <Trash2 className="size-4 mb-0.5" />
                      <span>Marked for Delete</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Newly Staged Uploads */}
            {stagedFiles.map((item) => {
              const isMain = mainPhotoKey === item.file.name;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group relative aspect-video overflow-hidden rounded-xl border-2 transition",
                    isMain
                      ? "border-[#ffcc00] shadow-md ring-2 ring-[#ffcc00]/60"
                      : "border-border bg-muted/40 hover:border-[#ffcc00]/60",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="size-full object-cover"
                  />

                  {/* Main Photo Badge / Selector */}
                  <div className="absolute left-1.5 top-1.5 z-10">
                    {isMain ? (
                      <span className="flex items-center gap-1 rounded-md bg-[#ffcc00] px-1.5 py-0.5 text-[9px] font-black text-black shadow-sm">
                        <Star className="size-2.5 fill-black text-black" />
                        Main Photo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMainPhotoKey(item.file.name);
                        }}
                        className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-[#ffcc00] hover:text-black"
                        title="Set as Main Thumbnail"
                      >
                        <Star className="size-2.5" />
                        Set Main
                      </button>
                    )}
                  </div>

                  {/* Quick Action Buttons (View + Remove) */}
                  <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewModalUrl(item.previewUrl);
                      }}
                      className="rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/90"
                      title="Preview"
                    >
                      <Eye className="size-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveStaged(item.id, e)}
                      className="rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                      title="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </div>

                  {/* New upload indicator tag */}
                  <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[8px] font-bold text-amber-300">
                    New
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* File Preview Modal */}
      <FileViewModal
        open={Boolean(viewModalUrl)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setViewModalUrl(null);
        }}
        fileUrl={viewModalUrl}
        title="Vehicle Photo Preview"
      />
    </div>
  );
}
