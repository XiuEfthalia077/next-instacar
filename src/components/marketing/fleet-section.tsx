"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Fuel,
  Gauge,
  Heart,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { CarImage } from "@/components/marketing/car-image";
import { useFavorites } from "@/lib/hooks/use-favorites";
import type { PopularCar } from "@/lib/public-stats";
import { carImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

function formatPrice(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * "Our Popular Rides" — featured mobile-first car catalog.
 */
export function FleetSection({ cars }: { cars: PopularCar[] }) {
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <section id="fleet" className="py-12 md:py-16 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        {/* Section Heading */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00]">
              Ready for Immediate Handoff
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-foreground md:text-5xl">
              Featured <span className="text-amber-600 dark:text-[#ffcc00]">Vehicles</span>
            </h2>
          </div>

          <div className="hidden md:block">
            <Link
              href="/user/cars"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-600 dark:text-[#ffcc00] dark:hover:text-[#ffd633] transition-colors"
            >
              <span>View Full Fleet (All Branches)</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {cars.length === 0 ? (
          <div className="py-12 text-center rounded-3xl border border-dashed border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
              No vehicles are currently listed. Check back shortly or contact our dispatch team!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 px-1 sm:px-0 md:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => {
              const photo = car.image_path
                ? car.image_path.split(",")[0].trim()
                : "";
              const image = carImageUrl(photo || "default.png");
              const brand = car.brand || "Vehicle";
              const model = car.model || "";
              const carName = `${brand} ${model}`;
              const favorited = isFavorite(car.id);

              return (
                <article
                  key={car.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#ffcc00]/60 hover:shadow-xl w-full"
                >
                  {/* 16:9 Vehicle Hero Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/60 flex items-center justify-center select-none">
                    <CarImage src={image} alt={carName} />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

                    {/* Top Left: Type Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur border border-white/10">
                        {car.type || "Sedan"}
                      </span>
                    </div>

                    {/* Top Right: Floating Favorite Heart Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
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

                    {/* Bottom Right: Status Badge */}
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/85 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 backdrop-blur border border-emerald-500/30">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        AVAILABLE
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
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
                            ₱{formatPrice(car.price_24_hours)}
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
                        {car.capacity ?? 5} Seats
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-semibold">
                        <Fuel className="size-3 text-[#ffcc00]" />
                        {car.fuel_type || "Gasoline"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 font-semibold text-foreground">
                        Unlimited Miles
                      </span>
                    </div>

                    {/* Touch-Friendly Action Button (min-h-[44px]) */}
                    <Link
                      href={`/user/cars?search=${encodeURIComponent(carName)}`}
                      className="mt-auto flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#ffcc00] px-4 py-2.5 text-xs font-black text-black shadow-md transition-all hover:bg-[#ffd633] active:scale-[0.98] cursor-pointer"
                    >
                      <CheckCircle2 className="size-4 stroke-[2.5]" />
                      <span>Reserve Vehicle</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Mobile View All Link */}
        <div className="mt-6 text-center md:hidden">
          <Link
            href="/user/cars"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:border-[#ffcc00]"
          >
            <span>View Full Fleet (All Branches)</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
