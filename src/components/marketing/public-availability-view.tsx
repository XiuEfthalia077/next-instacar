"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Fuel,
  Gauge,
  Info,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { Money } from "@/components/common/money";
import { AvailabilityCalendar, type BlockedRange } from "@/components/common/availability-calendar";
import { CarGalleryModal } from "@/components/customer/car-gallery-modal";
import type { CachedBranch, CarWithOwner } from "@/lib/data/cars";
import { carImageUrls } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface PublicAvailabilityViewProps {
  cars: CarWithOwner[];
  branches: CachedBranch[];
  blockedRangesByCar: Record<number, BlockedRange[]>;
  initialCarId?: number;
}

export function PublicAvailabilityView({
  cars,
  branches,
  blockedRangesByCar,
  initialCarId,
}: PublicAvailabilityViewProps) {
  // Selected car state
  const [selectedCarId, setSelectedCarId] = React.useState<number>(() => {
    if (initialCarId && cars.some((c) => c.id === initialCarId)) {
      return initialCarId;
    }
    return cars[0]?.id || 0;
  });

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("All");
  const [branchFilter, setBranchFilter] = React.useState<string>("All");

  // Date Checker states (for global range check & calendar inspection)
  const [checkStartDate, setCheckStartDate] = React.useState<string>("");
  const [checkEndDate, setCheckEndDate] = React.useState<string>("");

  // Gallery modal state
  const [galleryCar, setGalleryCar] = React.useState<CarWithOwner | null>(null);
  const [galleryOpen, setGalleryOpen] = React.useState(false);

  // Extract unique car types for filter pills
  const availableTypes = React.useMemo(() => {
    const set = new Set<string>();
    cars.forEach((c) => {
      if (c.type) set.add(c.type);
    });
    return ["All", ...Array.from(set).sort()];
  }, [cars]);

  // Selected car object
  const selectedCar = React.useMemo(() => {
    return cars.find((c) => c.id === selectedCarId) || cars[0] || null;
  }, [cars, selectedCarId]);

  // Blocked ranges for the selected car
  const selectedBlockedRanges = React.useMemo(() => {
    return selectedCar ? blockedRangesByCar[selectedCar.id] || [] : [];
  }, [selectedCar, blockedRangesByCar]);

  // Helper: check if a specific car is available for the given date range
  const isCarAvailableForRange = React.useCallback(
    (carId: number, start: string, end: string) => {
      if (!start || !end) return true;
      const ranges = blockedRangesByCar[carId] || [];
      return !ranges.some((range) => {
        // Range overlap condition: max(start1, start2) <= min(end1, end2)
        return range.start <= end && range.end >= start;
      });
    },
    [blockedRangesByCar],
  );

  // Filter cars based on search, type, branch, and optional date range
  const filteredCars = React.useMemo(() => {
    return cars.filter((car) => {
      // Type filter
      if (typeFilter !== "All" && car.type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // Branch filter
      if (branchFilter !== "All" && String(car.branch_id) !== branchFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${car.brand} ${car.model}`.toLowerCase();
        const type = (car.type || "").toLowerCase();
        const branchName = (car.branches?.name || "").toLowerCase();
        const transmission = (car.transmission || "").toLowerCase();

        if (
          !fullName.includes(q) &&
          !type.includes(q) &&
          !branchName.includes(q) &&
          !transmission.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [cars, typeFilter, branchFilter, searchQuery]);

  // Calendar date range selection callback
  const handleCalendarRangeSelect = (startDay: string, endDay: string) => {
    setCheckStartDate(startDay);
    setCheckEndDate(endDay);
  };

  // Evaluation of selected car against selected date range
  const rangeEvaluation = React.useMemo(() => {
    if (!checkStartDate || !checkEndDate || !selectedCar) return null;

    const start = checkStartDate <= checkEndDate ? checkStartDate : checkEndDate;
    const end = checkStartDate <= checkEndDate ? checkEndDate : checkStartDate;

    const ranges = blockedRangesByCar[selectedCar.id] || [];
    const conflict = ranges.find((r) => r.start <= end && r.end >= start);

    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const days = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) || 1);
    const estimatedTotal = (selectedCar.price_24_hours || 0) * days;

    return {
      isAvailable: !conflict,
      conflictRange: conflict,
      days,
      estimatedTotal,
      startDate: start,
      endDate: end,
    };
  }, [checkStartDate, checkEndDate, selectedCar, blockedRangesByCar]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:py-12">
      {/* ------------------------------------------------------------------- */}
      {/* 1. Header Banner & Filter Strip */}
      {/* ------------------------------------------------------------------- */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffcc00]/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-500 dark:text-[#ffcc00] mb-2 border border-[#ffcc00]/30">
              <CalendarClock className="size-3.5" />
              <span>Live Fleet Schedule</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Vehicle Availability & Calendar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Inspect real-time booking schedules and open calendar dates across our entire rental fleet.
              Select any vehicle below to view its availability timeline.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login?next=/user/cars"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#ffcc00] px-4 text-xs font-black text-black shadow-sm hover:bg-[#ffd633] transition-all active:scale-95"
            >
              <Lock className="mr-1.5 size-3.5" />
              Sign In to Book
            </Link>
          </div>
        </div>

        {/* Search, Filter Pills & Date Range Checker Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-6 lg:col-span-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brand, model, features..."
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-[#ffcc00] focus:outline-hidden focus:ring-1 focus:ring-[#ffcc00]"
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

            {/* Branch Filter */}
            <div className="sm:col-span-6 lg:col-span-3">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:border-[#ffcc00] focus:outline-hidden focus:ring-1 focus:ring-[#ffcc00]"
              >
                <option value="All">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Quick Check (Start & End Date) */}
            <div className="sm:col-span-12 lg:col-span-4 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={checkStartDate}
                  onChange={(e) => setCheckStartDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:border-[#ffcc00] focus:outline-hidden"
                  title="Check Pick-up Date"
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground">to</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={checkEndDate}
                  onChange={(e) => setCheckEndDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-2.5 text-xs font-semibold text-foreground focus:border-[#ffcc00] focus:outline-hidden"
                  title="Check Return Date"
                />
              </div>
              {(checkStartDate || checkEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckStartDate("");
                    setCheckEndDate("");
                  }}
                  title="Clear dates"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Body Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">Vehicle Category:</span>
            {availableTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                  typeFilter === type
                    ? "bg-[#ffcc00] text-black shadow-xs font-black"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60",
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Main Two-Column Layout (Vehicle Selector + Schedule Calendar) */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Vehicle Cards List (Col 1 to 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-bold">
              Showing <strong className="text-foreground">{filteredCars.length}</strong> vehicles
            </span>
            <span>Click any vehicle to view its schedule</span>
          </div>

          {filteredCars.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Car className="mx-auto size-12 opacity-40 mb-3" />
              <h3 className="text-base font-bold text-foreground">No vehicles match your filters</h3>
              <p className="mt-1 text-xs">Try selecting a different car category or clearing your search query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("All");
                  setBranchFilter("All");
                  setCheckStartDate("");
                  setCheckEndDate("");
                }}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-secondary px-4 text-xs font-bold text-foreground hover:bg-secondary/80"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCars.map((car) => {
                const isSelected = selectedCar?.id === car.id;
                const carName = `${car.brand} ${car.model}`.trim();
                const photos = carImageUrls(car.image_path);
                const coverPhoto = photos[0]?.url || "/images/cars/default.png";

                // Date-range check status
                let dateBadge = null;
                if (checkStartDate && checkEndDate) {
                  const available = isCarAvailableForRange(car.id, checkStartDate, checkEndDate);
                  dateBadge = available ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                      <CheckCircle2 className="size-3" />
                      Available for your dates
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-600/90 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                      <XCircle className="size-3" />
                      Booked for your dates
                    </span>
                  );
                }

                return (
                  <div
                    key={car.id}
                    onClick={() => setSelectedCarId(car.id)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs transition-all duration-200 cursor-pointer hover:shadow-md",
                      isSelected
                        ? "border-[#ffcc00] ring-2 ring-[#ffcc00]/40 shadow-lg -translate-y-0.5"
                        : "border-border hover:border-[#ffcc00]/40",
                    )}
                  >
                    {/* Selected Indicator Pill */}
                    {isSelected && (
                      <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[10px] font-black text-black shadow-md">
                        <CheckCircle2 className="size-3" />
                        <span>Viewing Schedule</span>
                      </div>
                    )}

                    {/* Vehicle Photo Container */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverPhoto}
                        alt={carName}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      {/* Top Left: Badges */}
                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1 z-10">
                        <span className="rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white border border-white/10 backdrop-blur">
                          {car.type || "Car"}
                        </span>
                        {car.branches?.name && (
                          <span className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-400/30 backdrop-blur">
                            <MapPin className="size-2.5" />
                            {car.branches.name}
                          </span>
                        )}
                      </div>

                      {/* Photo Gallery Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryCar(car);
                          setGalleryOpen(true);
                        }}
                        className="absolute right-3 bottom-3 z-10 flex items-center gap-1 rounded-lg bg-black/75 px-2 py-1 text-[10px] font-bold text-white border border-white/20 backdrop-blur hover:bg-black transition-all"
                        title="View photo gallery"
                      >
                        <Camera className="size-3 text-[#ffcc00]" />
                        <span>{photos.length}</span>
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="flex flex-1 flex-col p-4">
                      {/* Date Badge if range check active */}
                      {dateBadge && <div className="mb-2">{dateBadge}</div>}

                      {/* Title & Price Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-foreground truncate group-hover:text-amber-500 dark:group-hover:text-[#ffcc00] transition-colors">
                            {carName}
                          </h3>
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {car.type || "Vehicle"} • {car.transmission || "Automatic"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-base font-black text-amber-500 dark:text-[#ffcc00]">
                              <Money value={car.price_24_hours} />
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold">/day</span>
                          </div>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="my-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-semibold">
                          <Users className="size-3 text-[#ffcc00]" />
                          {car.capacity || 5} seats
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-semibold">
                          <Fuel className="size-3 text-[#ffcc00]" />
                          {car.fuel_type || "Gasoline"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-semibold">
                          <Gauge className="size-3 text-[#ffcc00]" />
                          {car.transmission || "Auto"}
                        </span>
                      </div>

                      {/* Bottom Button */}
                      <div className="mt-auto pt-2">
                        <button
                          type="button"
                          className={cn(
                            "flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all",
                            isSelected
                              ? "bg-[#ffcc00] text-black font-black"
                              : "bg-secondary text-foreground hover:bg-secondary/80",
                          )}
                        >
                          <Calendar className="size-3.5" />
                          <span>{isSelected ? "Selected (Viewing Calendar)" : "Select to Check Schedule"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Selected Car Calendar & Read-Only Schedule Details (Col 8 to 12) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          {selectedCar ? (
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-md space-y-5">
              {/* Selected Car Header */}
              <div className="flex items-center gap-3.5 border-b border-border/80 pb-4">
                <div
                  onClick={() => {
                    setGalleryCar(selectedCar);
                    setGalleryOpen(true);
                  }}
                  className="relative size-16 overflow-hidden rounded-2xl bg-black/50 shrink-0 cursor-pointer border border-border group"
                  title="Click to view photos"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={carImageUrls(selectedCar.image_path)[0]?.url || "/images/cars/default.png"}
                    alt={selectedCar.model || "Vehicle"}
                    className="size-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-[#ffcc00] px-2 py-0.5 text-[10px] font-black text-black">
                      {selectedCar.type || "Vehicle"}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {selectedCar.branches?.name || "Main Branch"}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-foreground truncate mt-0.5">
                    {selectedCar.brand} {selectedCar.model}
                  </h2>
                  <div className="flex items-baseline gap-1 text-xs">
                    <span className="font-black text-amber-500 dark:text-[#ffcc00] text-sm">
                      <Money value={selectedCar.price_24_hours} />
                    </span>
                    <span className="text-muted-foreground font-semibold">/ 24 hours</span>
                  </div>
                </div>
              </div>

              {/* Interactive Calendar Widget */}
              <div>
                <AvailabilityCalendar
                  title={`Availability: ${selectedCar.brand} ${selectedCar.model}`}
                  startDate={checkStartDate}
                  endDate={checkEndDate}
                  blockedRanges={selectedBlockedRanges}
                  onSelectRange={handleCalendarRangeSelect}
                  allowPastDates={false}
                  className="border-border/60 bg-background/50"
                />
              </div>

              {/* Date Inspection Status Result */}
              {rangeEvaluation && (
                <div
                  className={cn(
                    "rounded-2xl p-4 border text-xs",
                    rangeEvaluation.isAvailable
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-200",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {rangeEvaluation.isAvailable ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    ) : (
                      <XCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-sm">
                        {rangeEvaluation.isAvailable
                          ? "✅ Vehicle is Available for these dates!"
                          : "⚠️ Vehicle is Unavailable / Reserved"}
                      </p>
                      <p className="opacity-90">
                        {rangeEvaluation.isAvailable ? (
                          <>
                            Selected: <strong>{rangeEvaluation.startDate}</strong> to{" "}
                            <strong>{rangeEvaluation.endDate}</strong> ({rangeEvaluation.days} day
                            {rangeEvaluation.days > 1 ? "s" : ""}). Estimated total:{" "}
                            <strong>₱{rangeEvaluation.estimatedTotal.toLocaleString()}</strong>.
                          </>
                        ) : (
                          <>
                            This vehicle has an active reservation overlapping{" "}
                            <strong>{rangeEvaluation.conflictRange?.start}</strong> to{" "}
                            <strong>{rangeEvaluation.conflictRange?.end}</strong>. Please pick different
                            dates or select another car.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STRICTLY READ-ONLY RESERVATION ACTION AREA */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="size-4 text-[#ffcc00]" />
                  <span>Ready to Reserve this Vehicle?</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bookings require customer verification. Sign in to your account to reserve directly,
                  or contact our team on Messenger for immediate booking assistance.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Link
                    href={`/login?next=/user/cars`}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#ffcc00] px-3 text-xs font-black text-black hover:bg-[#ffd633] transition-all shadow-sm active:scale-95"
                  >
                    <Lock className="size-3.5" />
                    <span>Log In to Book</span>
                  </Link>

                  <a
                    href="https://m.me/103496555339512"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground hover:bg-muted transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="size-3.5 text-[#ffcc00]" />
                    <span>Chat on Messenger</span>
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold"
                  >
                    <span>Create Free Account →</span>
                  </Link>

                  <a
                    href="tel:09175540394"
                    className="inline-flex items-center gap-1 text-foreground hover:text-amber-500 dark:hover:text-[#ffcc00] font-semibold"
                  >
                    <Phone className="size-3.5" />
                    <span>0917 554 0394</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              <Calendar className="mx-auto size-10 opacity-40 mb-2" />
              <p className="text-xs font-bold">Select a vehicle to inspect its calendar schedule.</p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Photo Gallery Lightbox Modal */}
      {/* ------------------------------------------------------------------- */}
      <CarGalleryModal
        car={galleryCar}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </div>
  );
}
