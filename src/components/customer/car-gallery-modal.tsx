"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Car,
  Calendar,
  Fuel,
  Gauge,
  MapPin,
  Users,
  Camera,
  CheckCircle2,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/common/money";
import { carImageUrls } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { CarWithOwner } from "@/lib/data/cars";

interface CarGalleryModalProps {
  car: CarWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookNow?: () => void;
}

export function CarGalleryModal({
  car,
  open,
  onOpenChange,
  onBookNow,
}: CarGalleryModalProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Extract all photos from vehicle's media stash
  const photos = car ? carImageUrls(car.image_path) : [];

  // Reset index when opening a new car
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
    }
  }, [open, car?.id]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setActiveIdx((cur) => (cur === 0 ? photos.length - 1 : cur - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setActiveIdx((cur) => (cur === photos.length - 1 ? 0 : cur + 1));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrev, handleNext]);

  if (!car) return null;

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const activePhoto = photos[activeIdx] || photos[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border bg-[#0d0f12] p-0 text-foreground sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* HEADER */}
        <DialogHeader className="border-b border-border/80 bg-card px-5 py-4 sm:px-6 flex flex-row items-center justify-between pr-14">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                {car.type || "Sedan"}
              </span>
              {car.branches?.name ? (
                <span className="flex items-center gap-1 rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[10px] font-extrabold text-black">
                  <MapPin className="size-3" />
                  {car.branches.name}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <Camera className="size-3" />
                {photos.length} Photo{photos.length > 1 ? "s" : ""}
              </span>
            </div>
            <DialogTitle className="mt-1 text-lg font-black text-foreground truncate">
              {carName}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* MAIN PHOTO DISPLAY WITH CONTROLS */}
        <div className="relative flex-1 bg-black/90 flex items-center justify-center min-h-[300px] max-h-[58vh] overflow-hidden p-3 sm:p-5 select-none">
          {activePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={activePhoto.url}
              src={activePhoto.url}
              alt={`${carName} photo ${activeIdx + 1}`}
              className="max-h-[52vh] w-auto max-w-full rounded-xl object-contain shadow-2xl transition duration-200"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Car className="size-16" />
              <p className="text-sm">No photo available</p>
            </div>
          )}

          {/* Previous / Next Arrow Controls */}
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-[#ffcc00] hover:text-black hover:scale-110 active:scale-95 shadow-lg focus:outline-none"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-[#ffcc00] hover:text-black hover:scale-110 active:scale-95 shadow-lg focus:outline-none"
                aria-label="Next photo"
              >
                <ChevronRight className="size-6" />
              </button>

              {/* Counter Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-white backdrop-blur border border-white/10 shadow-sm">
                {activeIdx + 1} / {photos.length}
              </div>
            </>
          ) : null}
        </div>

        {/* THUMBNAILS STRIP */}
        {photos.length > 1 ? (
          <div className="border-t border-border/70 bg-card/60 p-2.5 overflow-x-auto">
            <div className="flex items-center gap-2 justify-center min-w-max mx-auto px-2">
              {photos.map((photo, index) => {
                const isActive = index === activeIdx;
                return (
                  <button
                    key={photo.name + index}
                    type="button"
                    onClick={() => setActiveIdx(index)}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus:outline-none",
                      isActive
                        ? "border-[#ffcc00] ring-2 ring-[#ffcc00]/40 scale-105 opacity-100"
                        : "border-border/60 opacity-60 hover:opacity-100 hover:border-foreground/50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* FOOTER & VEHICLE SPECS / BOOKING */}
        <div className="border-t border-border/80 bg-card p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Gauge className="size-3.5 text-[#ffcc00]" />
              {car.transmission || "Automatic"}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Users className="size-3.5 text-[#ffcc00]" />
              {car.capacity || 5} Seats
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Fuel className="size-3.5 text-[#ffcc00]" />
              {car.fuel_type || "Gasoline"}
            </span>
            <div className="text-xs">
              <span className="text-muted-foreground">24h Rate: </span>
              <span className="text-sm font-black text-[#ffcc00]">
                <Money value={car.price_24_hours} />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Close Gallery
            </Button>
            {onBookNow ? (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onBookNow();
                }}
                className="rounded-xl bg-[#ffcc00] px-5 text-xs font-black text-black transition hover:bg-[#ffd633]"
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                Book This Vehicle
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
