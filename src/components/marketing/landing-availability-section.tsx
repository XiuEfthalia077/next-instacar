"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Zap,
} from "lucide-react";
import { AvailabilityCalendar, type BlockedRange } from "@/components/common/availability-calendar";
import { CarImage } from "@/components/marketing/car-image";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import { RentCarFlowDialog } from "@/components/customer/rent-car-flow-dialog";
import { carImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { CachedBranch, CarWithOwner } from "@/lib/data/cars";

interface LandingAvailabilitySectionProps {
  cars: CarWithOwner[];
  branches: CachedBranch[];
  blockedRangesByCar: Record<number, BlockedRange[]>;
  initialCarId?: number;
  isLoggedIn?: boolean;
}

export function LandingAvailabilitySection({
  cars,
  branches,
  blockedRangesByCar,
  initialCarId,
  isLoggedIn = false,
}: LandingAvailabilitySectionProps) {
  const searchParams = useSearchParams();

  // URL Search Parameters
  const paramLocation = searchParams?.get("location");
  const paramStart = searchParams?.get("start");
  const paramEnd = searchParams?.get("end");
  const paramFulfillment = searchParams?.get("fulfillment");

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState<string>(() => {
    if (paramLocation && branches.some((b) => String(b.id) === paramLocation)) {
      return paramLocation;
    }
    return "all";
  });
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  // Selected date range from search or user calendar clicks
  const [selectedStart, setSelectedStart] = React.useState<string | undefined>(paramStart || undefined);
  const [selectedEnd, setSelectedEnd] = React.useState<string | undefined>(paramEnd || undefined);

  // Booking Flow Dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = React.useState(false);

  // Sync state if URL search parameters update
  React.useEffect(() => {
    if (paramLocation && branches.some((b) => String(b.id) === paramLocation)) {
      setSelectedBranch(paramLocation);
    }
    if (paramStart) {
      setSelectedStart(paramStart);
    }
    if (paramEnd) {
      setSelectedEnd(paramEnd);
    }
  }, [paramLocation, paramStart, paramEnd, branches]);

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

  // Filter cars based on brand, branch, category, and date availability
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
      // If user searched for dates, check if car has conflicting bookings
      if (selectedStart && selectedEnd) {
        const ranges = blockedRangesByCar[car.id] || [];
        const isConflict = ranges.some(
          (r) => selectedStart <= r.end && selectedEnd >= r.start
        );
        if (isConflict) {
          return false;
        }
      }
      return true;
    });
  }, [cars, selectedCategory, selectedBranch, searchQuery, selectedStart, selectedEnd, blockedRangesByCar]);

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
    <section
      id="availability-schedule"
      className="scroll-mt-16 py-12 md:py-20 bg-muted/20 border-y border-border/80 transition-colors"
    >
      <div id="availability" className="mx-auto w-full max-w-[1320px] px-4">
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

        {/* ── 1. Horizontal Filter Row (Task 1.4) ── */}
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
              {(searchQuery || selectedBranch !== "all" || selectedCategory !== "All" || selectedStart || selectedEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedBranch("all");
                    setSelectedCategory("All");
                    setSelectedStart(undefined);
                    setSelectedEnd(undefined);
                  }}
                  className="text-xs font-bold text-amber-600 dark:text-[#ffcc00] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Reset All Filters</span>
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

        {/* ── 2. Two-Column Layout (Task 1.4) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Significantly larger vehicle cards on desktop/laptops, compact on mobile */}
          <div className="lg:col-span-5 xl:col-span-6">
            <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <CarFront className="size-4 text-[#ffcc00]" />
                  Available Vehicles
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  Showing {Math.min(filteredCars.length, 4)} of {filteredCars.length} available
                </span>
              </div>

              {filteredCars.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No vehicles matched your filter parameters.
                </div>
              ) : (
                <div className="max-h-[640px] overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin">
                  {filteredCars.slice(0, 8).map((car) => {
                    const isSelected = activeCar?.id === car.id;
                    const photo = car.image_path ? car.image_path.split(",")[0].trim() : "";
                    const imgUrl = carImageUrl(photo || "default.png");
                    const carName = `${car.brand} ${car.model}`;

                    return (
                      <div
                        key={car.id}
                        onClick={() => setSelectedCarId(car.id)}
                        className={cn(
                          "group relative flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer",
                          isSelected
                            ? "border-[#ffcc00] bg-[#ffcc00]/10 shadow-md ring-1 ring-[#ffcc00]"
                            : "border-border/80 bg-muted/20 hover:border-[#ffcc00]/50 hover:bg-muted/40"
                        )}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        {/* Vehicle Thumbnail: Significantly larger on desktop/laptop */}
                        <div className="relative w-full sm:w-44 md:w-48 lg:w-44 xl:w-52 h-36 sm:h-28 lg:h-30 xl:h-34 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-xs">
                          <CarImage
                            src={imgUrl}
                            alt={carName}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 left-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-black uppercase text-white backdrop-blur-xs">
                            {car.type || "Sedan"}
                          </span>
                        </div>

                        {/* Vehicle Details */}
                        <div className="min-w-0 flex-1 w-full sm:w-auto">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-black text-sm sm:text-base text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-[#ffcc00] transition-colors">
                              {carName}
                            </h3>
                          </div>

                          {/* Specs Pills */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-semibold">
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground/80">
                              {car.transmission || "Automatic"}
                            </span>
                            <span>&bull;</span>
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground/80">
                              {car.capacity || 5} Seats
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground mt-1.5 truncate flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            <span>{car.branches?.name || "Main Branch"}</span>
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2 flex-wrap">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                Daily Rate
                              </span>
                              <span className="text-sm sm:text-base font-black text-amber-600 dark:text-[#ffcc00]">
                                <Money value={car.price_24_hours ?? 0} />
                                <span className="text-[10px] font-normal text-muted-foreground"> / 24h</span>
                              </span>
                            </div>

                            <span
                              className={cn(
                                "text-[11px] font-black px-2.5 py-1 rounded-xl transition-all shadow-xs",
                                isSelected
                                  ? "bg-[#ffcc00] text-black shadow-sm"
                                  : "bg-muted text-muted-foreground group-hover:bg-[#ffcc00]/20 group-hover:text-foreground"
                              )}
                            >
                              {isSelected ? "Active On Calendar ✓" : "View Dates →"}
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

          {/* RIGHT COLUMN: Modernized Dark-Theme Calendar with Yellow Selected, Green Available, Red Booked */}
          <div className="lg:col-span-7 xl:col-span-6">
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

                    {/* Instant Booking Trigger Dialog */}
                    <button
                      type="button"
                      onClick={() => setBookingDialogOpen(true)}
                      className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-[#ffcc00] px-4 py-2.5 text-xs font-black text-black shadow-sm hover:bg-[#ffd700] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="size-3.5" />
                      <span>Book Car</span>
                    </button>
                  </div>
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-emerald-500 shadow-xs" />
                    <span className="font-bold text-foreground">Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-rose-500 shadow-xs" />
                    <span className="font-bold text-foreground">Booked / Reserved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-[#ffcc00] shadow-xs" />
                    <span className="font-bold text-foreground">Selected Range</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full bg-muted-foreground/40" />
                    <span className="font-semibold text-muted-foreground">Past Dates</span>
                  </div>
                </div>

                {/* Interactive Availability Calendar */}
                <div className="pt-2">
                  <AvailabilityCalendar
                    startDate={selectedStart}
                    endDate={selectedEnd}
                    onSelectRange={(start, end) => {
                      setSelectedStart(start);
                      setSelectedEnd(end);
                    }}
                    blockedRanges={activeBlockedRanges}
                    title={`${activeCar.brand} ${activeCar.model} Availability`}
                  />
                </div>

                {/* Instant Booking Modal Dialog */}
                <RentCarFlowDialog
                  car={activeCar}
                  blockedRanges={activeBlockedRanges}
                  open={bookingDialogOpen}
                  onOpenChange={setBookingDialogOpen}
                  isLoggedIn={isLoggedIn}
                  initialStartDate={selectedStart}
                  initialEndDate={selectedEnd}
                />
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
