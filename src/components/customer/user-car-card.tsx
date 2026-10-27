"use client";

import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  Fuel,
  Gauge,
  MapPin,
  Users,
} from "lucide-react";

import { Money } from "@/components/common/money";
import { CarGalleryModal } from "@/components/customer/car-gallery-modal";
import {
  type BlockedRange,
  RentCarFlowDialog,
} from "@/components/customer/rent-car-flow-dialog";
import type { CarWithOwner } from "@/lib/data/cars";
import { carImageUrls } from "@/lib/storage";

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

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const photos = carImageUrls(car.image_path);
  const firstPhoto = photos[0]?.url || "/images/cars/default.png";

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-[#121417] text-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#ffcc00]/50 hover:shadow-xl">
        {/* IMAGE HEADER - CLICKABLE TO OPEN GALLERY */}
        <div
          onClick={() => setGalleryOpen(true)}
          className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden bg-black/60 select-none"
          title={`Click to view all ${photos.length} photos of this ${carName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstPhoto}
            alt={carName}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

          {/* Top Badges */}
          <div className="absolute left-3 top-3 right-3 flex items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
                {car.type || "Sedan"}
              </span>
              {car.branches?.name ? (
                <span className="flex items-center gap-1 rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[10px] font-extrabold text-black shadow-xs">
                  <MapPin className="size-3" />
                  {car.branches.name}
                </span>
              ) : null}
            </div>

            {/* View Gallery Badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur border border-white/10 transition group-hover:bg-[#ffcc00] group-hover:text-black group-hover:border-transparent">
              <Camera className="size-3" />
              <span>{photos.length} Photo{photos.length > 1 ? "s" : ""}</span>
            </span>
          </div>

          {/* Bottom Status Badge */}
          <div className="absolute bottom-3 right-3">
            <span className="inline-block rounded-full bg-black/80 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur border border-white/20">
              {car.status === "Active" ? "AVAILABLE" : car.status.toUpperCase()}
            </span>
          </div>

          {/* Hover View Gallery Pill Centered */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
            <span className="rounded-full bg-black/85 px-4 py-1.5 text-xs font-black text-[#ffcc00] shadow-lg border border-[#ffcc00]/40 flex items-center gap-1.5 backdrop-blur">
              <Camera className="size-3.5" />
              View Full Gallery
            </span>
          </div>
        </div>

        {/* CAR CONTENT */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-foreground group-hover:text-[#ffcc00] transition-colors">
                {carName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {car.type || "Sedan"} • {car.fuel_type || "Gasoline"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#ffcc00]">
                <Money value={car.price_24_hours} />
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                PER 24 HOURS
              </p>
            </div>
          </div>

          {/* Feature Specs */}
          <div className="my-3 grid grid-cols-3 gap-2 border-y border-border/70 py-2.5 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center">
              <Gauge className="size-3.5 mb-1 text-foreground" />
              <span className="text-[11px] font-medium">{car.transmission || "Automatic"}</span>
            </div>
            <div className="flex flex-col items-center">
              <Users className="size-3.5 mb-1 text-foreground" />
              <span className="text-[11px] font-medium">{car.capacity || 5} Seats</span>
            </div>
            <div className="flex flex-col items-center">
              <Fuel className="size-3.5 mb-1 text-foreground" />
              <span className="text-[11px] font-medium">{car.fuel_type || "Gasoline"}</span>
            </div>
          </div>

          {/* Hourly Rates */}
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              10 hrs: <strong className="text-foreground"><Money value={car.price_10_hours} /></strong>
            </span>
            <span>
              12 hrs: <strong className="text-foreground"><Money value={car.price_12_hours} /></strong>
            </span>
          </div>

          {/* Action Button: Book Now */}
          <div className="mt-auto">
            <RentCarFlowDialog
              car={car}
              agreementHtml={agreementHtml}
              blockedRanges={blockedRanges}
              open={bookingOpen}
              onOpenChange={setBookingOpen}
              trigger={
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#ffcc00] py-2.5 text-xs font-black text-black shadow-md transition-all hover:bg-[#ffd633] active:scale-[0.98]"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Book Now</span>
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* PHOTO GALLERY LIGHTBOX */}
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
