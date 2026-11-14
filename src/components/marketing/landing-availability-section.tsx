"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  CarFront,
  CheckCircle2,
  Clock,
  Filter,
  Fuel,
  Gauge,
  Lock,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AvailabilityCalendar, type BlockedRange } from "@/components/common/availability-calendar";
import { CarImage } from "@/components/marketing/car-image";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { carImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { CachedBranch, CarWithOwner } from "@/lib/data/cars";

interface LandingAvailabilitySectionProps {
  cars: CarWithOwner[];
  branches: CachedBranch[];
  blockedRangesByCar: Record<number, BlockedRange[]>;
  initialCarId?: number;
}

export function LandingAvailabilitySection({
  cars,
  branches,
  blockedRangesByCar,
  initialCarId,
}: LandingAvailabilitySectionProps) {
  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState<string>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  // Selected car for interactive calendar inspection
  const [selectedCarId, setSelectedCarId] = React.useState<number>(() => {
    if (initialCarId && cars.some((c) => c.id === initialCarId)) {
      return initialCarId;
    }
    return cars[0]?.id || 0;
  });

  // Extract unique categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    cars.forEach((c) => {
      if (c.type) set.add(c.type);
    });
    return ["All", ...Array.from(set).sort()];
  }, [cars]);

  // Filter cars
  const filteredCars = React.useMemo(() => {
    return cars.filter((car) => {
      if (selectedCategory !== "All" && car.type?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (selectedBranch !== "all" && String(car.branch_id) !== selectedBranch) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${car.brand} ${car.model}`.toLowerCase();
        const type = (car.type || "").toLowerCase();
        const branchName = (car.branches?.name || "").toLowerCase();
        if (!fullName.includes(q) && !type.includes(q) && !branchName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [cars, selectedCategory, selectedBranch, searchQuery]);

  // Ensure an active selected car exists in the filtered set if possible
  React.useEffect(() => {
    if (filteredCars.length > 0 && !filteredCars.some((c) => c.id === selectedCarId)) {
      setSelectedCarId(filteredCars[0].id);
    }
  }, [filteredCars, selectedCarId]);

  const activeCar = React.useMemo(() => {
    return cars.find((c) => c.id === selectedCarId) || filteredCars[0] || cars[0] || null;
  }, [cars, filteredCars, selectedCarId]);

  const activeBlockedRanges = React.useMemo(() => {
    return activeCar ? blockedRangesByCar[activeCar.id] || [] : [];
  }, [activeCar, blockedRangesByCar]);

  return (
    <section id="availability" className="py-12 md:py-20 bg-muted/20 border-y border-border/80">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        {/* Section Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ffcc00]/50 bg-[#ffcc00]/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00] mb-2 shadow-xs">
              <CalendarRange className="size-3.5" />
              <span>Real-Time Fleet Availability</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Inspect Schedule &amp; <span className="text-amber-600 dark:text-[#ffcc00]">Book Instantly</span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Select any vehicle on the left to inspect its live booking schedule, open dates, and pricing tiers on the calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing <strong className="text-foreground">{filteredCars.length}</strong> available vehicles
            </span>
          </div>
        </div>

        {/* ── 1. Horizontal Filter Row (Task 1.3) ── */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
            {/* Search Brand / Model */}
            <div className="sm:col-span-6 lg:col-span-5 relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand, model (e.g. Fortuner, Vios)..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-[#ffcc00] focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Branch Dropdown */}
            <div className="sm:col-span-6 lg:col-span-4">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:border-[#ffcc00] focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Pickup Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Reset */}
            <div className="sm:col-span-12 lg:col-span-3 flex justify-end">
              {(searchQuery || selectedBranch !== "all" || selectedCategory !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBranch("all");
                    setSelectedCategory("All");
                  }}
                  className="text-xs font-bold text-amber-600 dark:text-[#ffcc00] hover:underline flex items-center gap-1"
                >
                  <span>Reset Filters</span>
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Pills (All, Hatchback, SUV, Sedan, Van, etc.) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="size-3" />
              Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-[#ffcc00] text-black shadow-xs font-black"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Two-Column Layout (Task 1.3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Scrollable box showing up to 4 available cars */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <CarFront className="size-4 text-[#ffcc00]" />
                  Available Vehicles
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Scroll for more ({filteredCars.length})
                </span>
              </div>

              {filteredCars.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No vehicles matched your filter parameters.
                </div>
              ) : (
                <div className="max-h-[580px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
                  {filteredCars.map((car) => {
                    const isSelected = activeCar?.id === car.id;
                    const photo = car.image_path ? car.image_path.split(",")[0].trim() : "";
                    const imgUrl = carImageUrl(photo || "default.png");
                    const carName = `${car.brand} ${car.model}`;

                    return (
                      <div
                        key={car.id}
                        onClick={() => setSelectedCarId(car.id)}
                        className={cn(
                          "group relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer",
                          isSelected
                            ? "border-[#ffcc00] bg-[#ffcc00]/10 shadow-md ring-1 ring-[#ffcc00]"
                            : "border-border/70 bg-muted/20 hover:border-[#ffcc00]/50 hover:bg-muted/40"
                        )}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        {/* Vehicle Thumbnail */}
                        <div className="relative size-18 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted">
                          <CarImage src={imgUrl} alt={carName} className="size-full object-cover" />
                        </div>

                        {/* Vehicle Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-extrabold text-sm text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-[#ffcc00] transition-colors">
                              {carName}
                            </p>
                            <span className="text-[10px] font-bold uppercase rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground shrink-0">
                              {car.type || "Sedan"}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            {car.branches?.name || "Main Branch"}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-xs font-black text-foreground">
                              <Money value={car.price_24_hours ?? 0} />
                              <span className="text-[10px] font-normal text-muted-foreground"> / 24h</span>
                            </span>

                            <span
                              className={cn(
                                "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                                isSelected
                                  ? "bg-[#ffcc00] text-black"
                                  : "text-muted-foreground bg-muted/60"
                              )}
                            >
                              {isSelected ? "Active On Calendar" : "View Dates →"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Calendar showing Available, Booked, Past */}
          <div className="lg:col-span-7">
            {activeCar ? (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-4">
                {/* Active Car Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/80">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      <CarImage
                        src={carImageUrl(activeCar.image_path?.split(",")[0].trim() || "default.png")}
                        alt={`${activeCar.brand} ${activeCar.model}`}
                        className="size-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-foreground">
                        {activeCar.brand} {activeCar.model}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{activeCar.type}</span> &bull;
                        <span>{activeCar.transmission || "Automatic"}</span> &bull;
                        <span>{activeCar.capacity || 5} Seats</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Base 24h Tariff
                      </span>
                      <span className="text-base font-black text-amber-600 dark:text-[#ffcc00]">
                        <Money value={activeCar.price_24_hours ?? 0} />
                      </span>
                    </div>

                    <Link
                      href={`/register?car_id=${activeCar.id}`}
                      className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-[#ffcc00] px-4 py-2.5 text-xs font-black text-black shadow-sm hover:bg-[#ffd700] hover:scale-105 active:scale-95 transition-all"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Book Car</span>
                    </Link>
                  </div>
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-emerald-500" />
                    <span className="font-bold text-foreground">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-rose-500" />
                    <span className="font-bold text-foreground">Booked / Reserved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-muted-foreground/40" />
                    <span className="font-semibold text-muted-foreground">Past Dates</span>
                  </div>
                </div>

                {/* Interactive Availability Calendar */}
                <div className="pt-2">
                  <AvailabilityCalendar
                    blockedRanges={activeBlockedRanges}
                    title={`${activeCar.brand} ${activeCar.model} Availability`}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
                Select a vehicle to inspect its live booking schedule.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
