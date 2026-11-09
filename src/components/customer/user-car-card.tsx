"use client";

import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { Money } from "@/components/common/money";
import { CarGalleryModal } from "@/components/customer/car-gallery-modal";
import {
  type BlockedRange,
  RentCarFlowDialog,
} from "@/components/customer/rent-car-flow-dialog";
import { useFavorites } from "@/lib/hooks/use-favorites";
import type { CarWithOwner } from "@/lib/data/cars";
import { carImageUrls } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface UserCarCardProps {
  car: CarWithOwner;
  agreementHtml?: string;
  blockedRanges?: BlockedRange[];
}

export function UserCarCard({
  car,
  agreementHtml = "",
  blockedRanges = [],
}: UserCarCardProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(car.id);

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const photos = carImageUrls(car.image_path);
  const currentPhoto = photos[activePhotoIdx]?.url || photos[0]?.url || "/images/cars/default.png";

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#ffcc00]/50 hover:shadow-xl w-full">
        {/* 16:9 VEHICLE HERO IMAGE CONTAINER */}
        <div
          onClick={() => setGalleryOpen(true)}
          className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden bg-black/60 select-none"
          title={`Click to view photos of ${carName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPhoto}
            alt={carName}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

          {/* Top Left: Type & Branch Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 z-10">
            <span className="rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur border border-white/10">
              {car.type || "Sedan"}
            </span>
            {car.branches?.name ? (
              <span className="flex items-center gap-1 rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[10px] font-black text-black shadow-xs">
                <MapPin className="size-3" />
                {car.branches.name}
              </span>
            ) : null}
          </div>

          {/* Top Right: Floating Favorite Heart Button (size-9 touch circle) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(car.id);
            }}
            aria-label={favorited ? "Remove from wishlist" : "Save to wishlist"}
            className={cn(
              "absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full backdrop-blur transition-all active:scale-90 shadow-md cursor-pointer",
              favorited
                ? "bg-rose-500 text-white shadow-rose-500/30 ring-2 ring-white/50"
                : "bg-black/60 text-white hover:text-rose-400 border border-white/20",
            )}
          >
            <Heart className={cn("size-4 transition-transform", favorited && "fill-current scale-110")} />
          </button>

          {/* Bottom Left: View Photos Button & Subtle Carousel Dots */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setGalleryOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white border border-white/20 backdrop-blur hover:bg-[#ffcc00] hover:text-black hover:border-[#ffcc00] transition-all shadow-md group/btn cursor-pointer"
              title={`View all ${photos.length} photos of ${carName}`}
            >
              <Camera className="size-3 text-[#ffcc00] group-hover/btn:text-black transition-colors" />
              <span>View Photos ({photos.length})</span>
            </button>

            {photos.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-black/50 px-2 py-1.5 rounded-full backdrop-blur-sm">
                {photos.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(idx);
                    }}
                    className={cn(
                      "size-1.5 rounded-full transition-all cursor-pointer",
                      idx === activePhotoIdx
                        ? "w-4 bg-[#ffcc00]"
                        : "bg-white/60 hover:bg-white",
                    )}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
                {photos.length > 5 && (
                  <span className="text-[9px] font-bold text-white/80 pl-0.5">+{photos.length - 5}</span>
                )}
              </div>
            )}
          </div>

          {/* Bottom Right: Status Badge */}
          <div className="absolute bottom-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/85 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 backdrop-blur border border-emerald-500/30">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {car.status === "Active" ? "AVAILABLE" : car.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* CARD CONTENT */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Header & Rating / Price Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-amber-600 dark:group-hover:text-[#ffcc00] transition-colors truncate">
                {carName}
              </h3>
              {/* Rating Line */}
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <div className="flex items-center gap-1 font-bold text-foreground">
                  <Star className="size-3.5 fill-[#ffcc00] text-[#ffcc00]" />
                  <span>4.95</span>
                </div>
                <span className="text-muted-foreground font-medium">• 42 trips</span>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                  <ShieldCheck className="size-3" />
                  Verified
                </span>
              </div>
            </div>

            {/* Clear Price Typography */}
            <div className="text-right shrink-0">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-[#ffcc00]">
                  <Money value={car.price_24_hours} />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">/ day</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                24H TIER
              </p>
            </div>
          </div>

          {/* Key Specs Row (Compact Horizontal Badges) */}
          <div className="my-3.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-semibold">
              <Gauge className="size-3 text-[#ffcc00]" />
              {car.transmission || "Automatic"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-semibold">
              <Users className="size-3 text-[#ffcc00]" />
              {car.capacity || 5} Seats
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-semibold">
              <Fuel className="size-3 text-[#ffcc00]" />
              {car.fuel_type || "Gasoline"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-semibold text-foreground">
              Unlimited Miles
            </span>
          </div>

          {/* Flexible Hourly Rates Strip */}
          <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span>
              10h Rate: <strong className="text-foreground font-black"><Money value={car.price_10_hours} /></strong>
            </span>
            <span className="text-border">•</span>
            <span>
              12h Rate: <strong className="text-foreground font-black"><Money value={car.price_12_hours} /></strong>
            </span>
          </div>

          {/* Touch-Friendly Action Buttons (min-h-[44px]) */}
          <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary/80 px-3 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary hover:border-[#ffcc00]/50 active:scale-[0.98] cursor-pointer"
              title="View all photos of this vehicle"
            >
              <Camera className="size-4 text-amber-600 dark:text-[#ffcc00]" />
              <span>{photos.length} Photos</span>
            </button>

            <RentCarFlowDialog
              car={car}
              agreementHtml={agreementHtml}
              blockedRanges={blockedRanges}
              open={bookingOpen}
              onOpenChange={setBookingOpen}
              trigger={
                <button
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl bg-[#ffcc00] px-3 py-2.5 text-xs font-black text-black shadow-md transition-all hover:bg-[#ffd633] active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="size-4 stroke-[2.5]" />
                  <span>Reserve Now</span>
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* PHOTO GALLERY & VEHICLE DETAIL LIGHTBOX */}
      <CarGalleryModal
        car={car}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onBookNow={() => {
          setGalleryOpen(false);
          setBookingOpen(true);
        }}
      />
    </>
  );
}
