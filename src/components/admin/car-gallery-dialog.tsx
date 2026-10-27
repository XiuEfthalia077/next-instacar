"use client";

import { ChevronLeft, ChevronRight, Images, Star, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/common/loading-button";
import { setMainImageAction } from "@/lib/actions/cars";
import { carImageUrl } from "@/lib/storage";

type CarGalleryDialogProps = {
  carId?: number;
  carName: string;
  plateNumber?: string | null;
  type?: string | null;
  imagePaths: string[];
  trigger?: React.ReactNode;
  canManage?: boolean;
};

export function CarGalleryDialog({
  carId,
  carName,
  plateNumber,
  type,
  imagePaths,
  trigger,
  canManage = true,
}: CarGalleryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Normalize image names (filtering empty/default)
  const images = React.useMemo(() => {
    const list = imagePaths.map((p) => p.trim()).filter(Boolean);
    return list.length ? list : ["default.png"];
  }, [imagePaths]);

  const currentMainPhoto = images[0];
  const activeImage = images[currentIndex] || images[0];
  const activeUrl = carImageUrl(activeImage);
  const isCurrentMain = activeImage === currentMainPhoto;
  const canSetMain = Boolean(
    canManage && carId && images.length > 0 && activeImage !== "default.png",
  );

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
          >
            <Images className="size-3.5" />
            <span>Gallery</span>
            {images.length > 1 ? (
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold">
                {images.length}
              </span>
            ) : null}
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl overflow-hidden border-border bg-card p-0 text-card-foreground sm:rounded-2xl">
        <DialogHeader className="border-b border-border/80 px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pr-8">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {carName}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {plateNumber ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-foreground">
                    {plateNumber}
                  </span>
                ) : null}
                {type ? <span>• {type}</span> : null}
                <span>
                  • Photo {currentIndex + 1} of {images.length}
                </span>
              </div>
            </div>

            {/* Set Main Photo action in Gallery Header */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              {isCurrentMain ? (
                <div className="flex items-center gap-1.5 rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-black text-black shadow-sm">
                  <Star className="size-3.5 fill-black text-black" />
                  <span>Main Photo</span>
                </div>
              ) : canSetMain ? (
                <form action={setMainImageAction}>
                  <input type="hidden" name="car_id" value={carId} />
                  <input type="hidden" name="image_name" value={activeImage} />
                  <LoadingButton
                    type="submit"
                    loadingText="Setting..."
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#ffcc00] px-3.5 text-xs font-black text-black shadow-sm transition hover:bg-[#ffd633]"
                    title="Set this photo as the vehicle thumbnail"
                  >
                    <Star className="size-3.5 fill-black text-black" />
                    <span>Set as Main Photo</span>
                  </LoadingButton>
                </form>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {/* Main large display */}
        <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-black/60">
          {/* Main Photo Status Tag on image */}
          {isCurrentMain && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md bg-[#ffcc00] px-2 py-0.5 text-[11px] font-black text-black shadow-md">
              <Star className="size-3 fill-black text-black" />
              <span>Main Photo</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeUrl}
            alt={`${carName} photo ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain transition-all duration-300"
          />

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur transition hover:scale-110 hover:bg-black/90"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur transition hover:scale-110 hover:bg-black/90"
                aria-label="Next image"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        {/* Thumbnails strip */}
        {images.length > 1 ? (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-border/60 bg-muted/20 p-4">
            {images.map((img, idx) => {
              const url = carImageUrl(img);
              const isActive = idx === currentIndex;
              const isMainThumb = img === currentMainPhoto;

              return (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    isActive
                      ? "border-[#ffcc00] ring-2 ring-[#ffcc00]/40"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="size-full object-cover"
                  />
                  {isMainThumb && (
                    <span
                      className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#ffcc00] text-black shadow-sm"
                      title="Current Main Photo"
                    >
                      <Star className="size-2.5 fill-black text-black" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
