"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Car,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_LOCATIONS = [
  { label: "All Branches", value: "All" },
  { label: "Iloilo Int'l Airport", value: "Airport" },
  { label: "SM City Iloilo", value: "SM City" },
  { label: "Pavia Hub", value: "Pavia" },
];

const VEHICLE_TYPES = [
  { label: "All Cars", value: "All", icon: Car },
  { label: "Sedan", value: "Sedan", icon: Car },
  { label: "SUV", value: "SUV", icon: Car },
  { label: "Van / MPV", value: "Van", icon: Users },
  { label: "Luxury", value: "Luxury", icon: Sparkles },
];

const QUICK_DATES = [
  { label: "Any Dates", days: 0 },
  { label: "This Weekend", days: 2 },
  { label: "Next 3 Days", days: 3 },
  { label: "1 Week Trip", days: 7 },
];

/**
 * Mobile Airbnb/Turo-style search pill trigger.
 */
export function MobileSearchPill({
  className,
  onClick,
  placeholder = "Search destination or car model • Any dates",
}: {
  className?: string;
  onClick?: () => void;
  placeholder?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.currentTarget.blur();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-3 text-left shadow-md backdrop-blur-md transition-all hover:border-[#ffcc00] hover:shadow-lg active:scale-[0.98] cursor-pointer min-h-[48px]",
        className,
      )}
      aria-label="Open search filter sheet"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ffcc00] text-black shadow-xs">
        <Search className="size-4 stroke-[2.5]" />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-xs font-black text-foreground">Where to next?</p>
        <p className="truncate text-[11px] font-medium text-muted-foreground">{placeholder}</p>
      </div>

      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground">
        <SlidersHorizontal className="size-3.5" />
      </div>
    </button>
  );
}

/**
 * Full Mobile Bottom Sheet Search Modal.
 */
export function MobileSearchSheet({
  open,
  onOpenChange,
  initialSearch = "",
  initialType = "All",
  initialLocation = "All",
  initialPickupDate = "",
  initialReturnDate = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
  initialType?: string;
  initialLocation?: string;
  initialPickupDate?: string;
  initialReturnDate?: string;
}) {
  const router = useRouter();

  const [query, setQuery] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [pickupDate, setPickupDate] = useState(initialPickupDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);

  const handleQuickDate = (days: number) => {
    if (days === 0) {
      setPickupDate("");
      setReturnDate("");
      return;
    }
    const today = new Date();
    const startStr = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + days);
    const endStr = end.toISOString().slice(0, 10);
    setPickupDate(startStr);
    setReturnDate(endStr);
  };

  const handleApply = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (selectedType !== "All") params.set("type", selectedType);
    if (selectedLocation !== "All") params.set("search", selectedLocation);
    if (pickupDate) params.set("pickup_date", pickupDate);
    if (returnDate) params.set("return_date", returnDate);

    onOpenChange(false);
    const url = `/user/cars${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(url);
  };

  const handleReset = () => {
    setQuery("");
    setSelectedType("All");
    setSelectedLocation("All");
    setPickupDate("");
    setReturnDate("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] max-h-[92vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-xl sm:mx-auto flex flex-col overflow-hidden"
      >
        {/* Handle */}
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        {/* Header */}
        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                <Search className="size-5 text-[#ffcc00]" />
                <span>Search &amp; Book Fleet</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Find available vehicles by location, dates, and vehicle tier
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* STEP 1: Search Query & Location */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5 text-[#ffcc00]" />
              <span>Step 1: Pick-Up Location or Model</span>
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, airport, brand (e.g. Vios, Fortuner)..."
                className="h-12 w-full rounded-2xl border border-border bg-muted/30 pl-10 pr-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground/70 focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Quick Auto-Complete Location Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setSelectedLocation(loc.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all min-h-[36px] cursor-pointer",
                    selectedLocation === loc.value
                      ? "bg-[#ffcc00] text-black shadow-xs font-black"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <MapPin className="size-3 shrink-0" />
                  <span>{loc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Date & Time Picker */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Calendar className="size-3.5 text-[#ffcc00]" />
              <span>Step 2: Rental Dates</span>
            </label>

            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2">
              {QUICK_DATES.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleQuickDate(preset.days)}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground min-h-[36px] cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Touch-Friendly Date Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl border border-border bg-muted/20 p-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Pick-Up Date
                </span>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="mt-1 w-full bg-transparent text-xs sm:text-sm font-bold text-foreground outline-none min-h-[36px]"
                />
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-3">
                <span className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Return Date
                </span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="mt-1 w-full bg-transparent text-xs sm:text-sm font-bold text-foreground outline-none min-h-[36px]"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Vehicle Type Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <Car className="size-3.5 text-[#ffcc00]" />
              <span>Step 3: Vehicle Type</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {VEHICLE_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all min-h-[48px] cursor-pointer",
                      isSelected
                        ? "border-[#ffcc00] bg-[#ffcc00]/10 text-foreground ring-1 ring-[#ffcc00]"
                        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl",
                        isSelected ? "bg-[#ffcc00] text-black" : "bg-muted text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-bold truncate", isSelected && "text-foreground")}>
                        {type.label}
                      </p>
                    </div>
                    {isSelected && <Check className="size-4 text-[#ffcc00] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="border-t border-border bg-card/95 p-4 backdrop-blur-md pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={handleApply}
            className="h-12 w-full rounded-2xl bg-[#ffcc00] text-base font-black text-black shadow-lg hover:bg-[#ffd633] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Search className="size-5 stroke-[2.5]" />
            <span>Search Available Cars</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
