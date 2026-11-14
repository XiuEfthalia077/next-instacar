"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  Heart,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { CarImage } from "@/components/marketing/car-image";
import { Money } from "@/components/common/money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { carImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { PopularCar } from "@/lib/public-stats";
import type { ReviewItem } from "@/components/marketing/reviews-section";

interface FeaturedCarsCarouselProps {
  cars: PopularCar[];
  reviews?: ReviewItem[];
}

export function FeaturedCarsCarousel({
  cars,
  reviews = [],
}: FeaturedCarsCarouselProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  // Selected car for detail modal
  const [selectedCar, setSelectedCar] = React.useState<PopularCar | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);

  // Review carousel state inside modal
  const [activeReviewIndex, setActiveReviewIndex] = React.useState(0);

  // Drag-to-scroll state
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    if (Math.abs(walk) > 4) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setTimeout(() => setIsDragging(false), 50);
  };

  // Filter reviews matching selected car model or brand
  const carSpecificReviews = React.useMemo(() => {
    if (!selectedCar) return [];
    const carBrand = (selectedCar.brand || "").toLowerCase();
    const carModel = (selectedCar.model || "").toLowerCase();

    const matches = reviews.filter((r) => {
      const revCar = (r.carName || "").toLowerCase();
      return revCar.includes(carBrand) || revCar.includes(carModel);
    });

    return matches.length > 0 ? matches : reviews.slice(0, 3);
  }, [selectedCar, reviews]);

  const carImages = React.useMemo(() => {
    if (!selectedCar?.image_path) return ["default.png"];
    const list = selectedCar.image_path.split(",").map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : ["default.png"];
  }, [selectedCar]);

  // Duplicate list to create a seamless infinite marquee animation loop
  const marqueeCars = React.useMemo(() => {
    if (cars.length === 0) return [];
    if (cars.length < 6) return [...cars, ...cars, ...cars];
    return [...cars, ...cars];
  }, [cars]);

  return (
    <section id="featured-cars" className="scroll-mt-16 py-12 md:py-16 overflow-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-4 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00]">
            Continuous Fleet Spotlight
          </span>
          <h2 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Featured <span className="text-amber-600 dark:text-[#ffcc00]">Cars Carousel</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Hover to pause, drag to browse. Click any vehicle to inspect photo galleries, specifications, and client reviews.
          </p>
        </div>

        <Link
          href="/user/cars"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-600 dark:text-[#ffcc00] dark:hover:text-[#ffd633] transition-colors shrink-0"
        >
          <span>View All Vehicles</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* ── Continuous Auto-Scrolling Marquee (Pauses on Hover & Draggable via Click-and-Drag) ── */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          "relative w-full overflow-x-auto no-scrollbar select-none py-2",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {/* Left / Right Vignette Gradients */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-background to-transparent" />

        <div
          className={cn(
            "flex gap-4 sm:gap-6 w-max",
            isDragging
              ? "animate-none"
              : "animate-carousel-scroll hover:[animation-play-state:paused]"
          )}
        >
          {marqueeCars.map((car, idx) => {
            const photo = car.image_path ? car.image_path.split(",")[0].trim() : "";
            const image = carImageUrl(photo || "default.png");
            const brand = car.brand || "Vehicle";
            const model = car.model || "";
            const carName = `${brand} ${model}`;
            const favorited = isFavorite(car.id);

            return (
              <div
                key={`${car.id}-${idx}`}
                onClick={() => {
                  if (isDragging) return;
                  setSelectedCar(car);
                  setActivePhotoIndex(0);
                  setActiveReviewIndex(0);
                }}
                className="group relative w-[280px] sm:w-[320px] shrink-0 rounded-3xl border border-border bg-card p-3 shadow-md hover:border-[#ffcc00] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                role="button"
                tabIndex={0}
              >
                {/* 16:9 Thumbnail Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted/60">
                  <CarImage src={image} alt={carName} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />

                  {/* Top Badge */}
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur border border-white/10 shadow-xs">
                    {car.type || "Sedan"}
                  </span>

                  {/* Favorite Heart */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(car.id);
                    }}
                    className={cn(
                      "absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-black/60 backdrop-blur text-white transition hover:scale-110 shadow-xs",
                      favorited && "bg-rose-500/90 text-white"
                    )}
                    aria-label="Add to favorites"
                  >
                    <Heart className={cn("size-4", favorited && "fill-current")} />
                  </button>
                </div>

                {/* Car Details */}
                <div className="pt-3 px-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-foreground group-hover:text-amber-600 dark:group-hover:text-[#ffcc00] transition-colors truncate">
                      {carName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{car.transmission || "Automatic"}</span> &bull;
                      <span>{car.capacity || 5} Seats</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Rate
                      </span>
                      <span className="text-sm font-black text-foreground">
                        <Money value={car.price_24_hours ?? 0} />
                        <span className="text-[10px] font-normal text-muted-foreground"> / 24h</span>
                      </span>
                    </div>

                    <span className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Details</span>
                      <span>&rarr;</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Vehicle Detail Modal with Gallery & Specific Reviews (Task 1.4) ── */}
      <Dialog
        open={selectedCar !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCar(null);
        }}
      >
        <DialogContent className="w-[94vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl border-border bg-card">
          {selectedCar ? (
            <div className="space-y-5">
              <DialogHeader className="border-b border-border/80 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-[#ffcc00]/20 px-3 py-0.5 text-xs font-black uppercase text-amber-700 dark:text-[#ffcc00]">
                      {selectedCar.type || "Sedan"} &bull; Inspected
                    </span>
                    <DialogTitle className="text-xl sm:text-2xl font-black text-foreground mt-1.5">
                      {selectedCar.brand} {selectedCar.model}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Available for pickup at Pavia Hub or Doorstep Delivery across Iloilo.
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-muted-foreground block">Rate</span>
                    <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-[#ffcc00]">
                      <Money value={selectedCar.price_24_hours ?? 0} />
                    </span>
                    <span className="text-[11px] text-muted-foreground block">/ 24 hours</span>
                  </div>
                </div>
              </DialogHeader>

              {/* 1. Large Photo Gallery Switcher */}
              <div className="space-y-2">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-black/60 shadow-inner">
                  <CarImage
                    src={carImageUrl(carImages[activePhotoIndex] || "default.png")}
                    alt={`${selectedCar.brand} ${selectedCar.model}`}
                    className="size-full object-cover"
                  />
                  {carImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : carImages.length - 1))
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIndex((prev) => (prev < carImages.length - 1 ? prev + 1 : 0))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails row */}
                {carImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {carImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePhotoIndex(i)}
                        className={cn(
                          "relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition",
                          activePhotoIndex === i
                            ? "border-[#ffcc00] ring-1 ring-[#ffcc00]"
                            : "border-border/60 opacity-60 hover:opacity-100"
                        )}
                      >
                        <CarImage src={carImageUrl(img)} alt={`Thumbnail ${i + 1}`} className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Full Vehicle Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Transmission
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {selectedCar.transmission || "Automatic"}
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Seating Capacity
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    {selectedCar.capacity || 5} Passengers
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    10-Hour Tier
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    ₱{Number(selectedCar.price_10_hours || 0).toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    12-Hour Tier
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    ₱{Number(selectedCar.price_12_hours || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 3. Secondary Carousel of Customer Reviews Specific to this Car */}
              <div className="rounded-2xl border border-border/90 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    Verified Client Reviews for this Model
                  </span>
                  {carSpecificReviews.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReviewIndex((prev) =>
                            prev > 0 ? prev - 1 : carSpecificReviews.length - 1
                          )
                        }
                        className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReviewIndex((prev) =>
                            prev < carSpecificReviews.length - 1 ? prev + 1 : 0
                          )
                        }
                        className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-muted"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {carSpecificReviews.length > 0 ? (
                  <div className="rounded-xl border border-border/60 bg-card p-3.5 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {carSpecificReviews[activeReviewIndex].authorName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {carSpecificReviews[activeReviewIndex].date}
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: carSpecificReviews[activeReviewIndex].rating }).map((_, i) => (
                          <Star key={i} className="size-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/90 font-medium italic">
                      &ldquo;{carSpecificReviews[activeReviewIndex].text}&rdquo;
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No specific reviews yet for this vehicle model. Be the first to book and share your feedback!
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCar(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
                <Link
                  href={`/register?car_id=${selectedCar.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-6 py-2.5 text-xs font-black text-black hover:bg-[#ffd700] shadow-md transition-all active:scale-95"
                >
                  <Sparkles className="size-4" />
                  <span>Reserve {selectedCar.brand} {selectedCar.model}</span>
                </Link>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
