"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bed,
  CalendarDays,
  Car,
  Clock,
  ChevronDown,
  MapPin,
  Plane,
  Search,
  Building2,
  Truck,
  Sparkles,
} from "lucide-react";
import {
  UberInteractiveMapDialog,
  BRANCH_COORDS,
} from "@/components/common/uber-interactive-map";
import { cn } from "@/lib/utils";

export interface BranchOption {
  id: number;
  name: string;
  address?: string | null;
}

interface KayakHeroSearchProps {
  branches?: BranchOption[];
  className?: string;
}

export function KayakHeroSearch({
  branches = [
    {
      id: 1,
      name: "InstaCar Pavia Hub (Main)",
      address: "Pandac, Pavia, 5001 Iloilo",
    },
    {
      id: 2,
      name: "Iloilo Airport Branch",
      address: "Cabatuan, Iloilo International Airport",
    },
    {
      id: 3,
      name: "Iloilo City Hub (Festive Walk)",
      address: "Megaworld Blvd, Mandurriao, Iloilo City",
    },
  ],
  className,
}: KayakHeroSearchProps) {
  const router = useRouter();

  // Category Tabs: Flights | Stays | Cars
  const [activeCategory, setActiveCategory] = React.useState<"cars" | "stays" | "flights">("cars");

  // Location & Fulfillment mode: "branch" or "delivery"
  const [locationMode, setLocationMode] = React.useState<"branch" | "delivery">("branch");
  const [selectedBranch, setSelectedBranch] = React.useState<BranchOption>(branches[0]);
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [deliveryFee, setDeliveryFee] = React.useState(0);
  const [mapOpen, setMapOpen] = React.useState(false);

  // Dates & Times (Defaults: Today 10:00 AM -> Tomorrow 10:00 AM)
  const [startDate, setStartDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = React.useState("10:00");
  const [endDate, setEndDate] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [endTime, setEndTime] = React.useState("10:00");

  // Driver Age selection
  const [driverAge, setDriverAge] = React.useState("25+");

  // Display text for location button
  const displayLocation =
    locationMode === "branch"
      ? selectedBranch.name
      : deliveryAddress || "Set Doorstep Delivery Location";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams({
      fulfillment: locationMode,
      location:
        locationMode === "branch"
          ? String(selectedBranch.id)
          : deliveryAddress || selectedBranch.name,
      start: startDate,
      pickup_time: startTime,
      end: endDate,
      return_time: endTime,
      age: driverAge,
    });

    if (locationMode === "delivery" && deliveryFee > 0) {
      params.set("delivery_fee", String(deliveryFee));
    }

    // Scroll smoothly to fleet section with search params applied
    router.push(`/#fleet?${params.toString()}`);

    const fleetEl = document.getElementById("fleet");
    if (fleetEl) {
      fleetEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={cn("w-full max-w-5xl mx-auto space-y-3", className)}>
      {/* ── Category Tabs: Flights / Stays / Cars (KAYAK signature layout) ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 p-1 bg-muted/70 backdrop-blur-md rounded-2xl border border-border/80 w-fit shadow-xs">
          <button
            type="button"
            onClick={() => setActiveCategory("cars")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
              activeCategory === "cars"
                ? "bg-[#ffcc00] text-black shadow-md scale-[1.02]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Car className="size-4" />
            <span>Cars</span>
          </button>

          <button
            type="button"
            onClick={() =>
              alert(
                "InstaCar specializes in self-drive and with-driver car rentals across Panay. Stays & Flights integration coming soon!"
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Bed className="size-4" />
            <span>Stays</span>
          </button>

          <button
            type="button"
            onClick={() =>
              alert(
                "InstaCar specializes in self-drive and with-driver car rentals across Panay. Stays & Flights integration coming soon!"
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Plane className="size-4" />
            <span>Flights</span>
          </button>
        </div>

        {/* Quick Mode Pill Switcher */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setLocationMode("branch")}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-bold transition border",
              locationMode === "branch"
                ? "bg-foreground/10 text-foreground border-foreground/20"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Branch Pickup (Free)
          </button>
          <button
            type="button"
            onClick={() => {
              setLocationMode("delivery");
              setMapOpen(true);
            }}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-bold transition border flex items-center gap-1",
              locationMode === "delivery"
                ? "bg-[#ffcc00]/20 text-[#b38a00] dark:text-[#ffcc00] border-[#ffcc00]/40"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            <Truck className="size-3" />
            Doorstep Delivery
          </button>
        </div>
      </div>

      {/* ── Unified Segmented Search Bar (KAYAK Style) ── */}
      <form
        onSubmit={handleSearchSubmit}
        className="rounded-3xl lg:rounded-full border border-border bg-card/95 backdrop-blur-xl p-2.5 lg:p-3 shadow-2xl shadow-black/25 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-center"
      >
        {/* 1. Location Segment: Opens Mini-Map Modal */}
        <div
          onClick={() => setMapOpen(true)}
          className="lg:col-span-4 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl lg:rounded-full bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-[#ffcc00]/60 transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMapOpen(true);
            }
          }}
          aria-label="Select pickup branch or doorstep delivery"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ffcc00]/20 text-[#ffcc00] group-hover:scale-105 transition-transform shadow-xs">
            {locationMode === "branch" ? (
              <Building2 className="size-4 text-amber-600 dark:text-[#ffcc00]" />
            ) : (
              <MapPin className="size-4 text-amber-600 dark:text-[#ffcc00]" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                {locationMode === "branch" ? "Pickup Branch" : "Doorstep Delivery"}
              </span>
              <span className="text-[9px] font-extrabold text-[#b38a00] dark:text-[#ffcc00] underline">
                Change
              </span>
            </div>
            <p className="text-xs sm:text-sm font-black text-foreground truncate">
              {displayLocation}
            </p>
          </div>
        </div>

        {/* 2. Pick-up Date & Time */}
        <div className="lg:col-span-3 flex items-center gap-2.5 px-3 py-2 rounded-2xl lg:rounded-full bg-muted/20 border border-border/40 hover:border-border transition">
          <CalendarDays className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
              Pick-up
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer w-[110px]"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-muted-foreground focus:outline-none cursor-pointer w-[62px]"
              />
            </div>
          </div>
        </div>

        {/* 3. Drop-off Date & Time */}
        <div className="lg:col-span-3 flex items-center gap-2.5 px-3 py-2 rounded-2xl lg:rounded-full bg-muted/20 border border-border/40 hover:border-border transition">
          <Clock className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
              Drop-off
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer w-[110px]"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-muted-foreground focus:outline-none cursor-pointer w-[62px]"
              />
            </div>
          </div>
        </div>

        {/* 4. Driver's Age & Search Action Button */}
        <div className="lg:col-span-2 flex items-center gap-2">
          {/* Driver's Age */}
          <div className="flex-1 relative">
            <select
              value={driverAge}
              onChange={(e) => setDriverAge(e.target.value)}
              className="w-full appearance-none rounded-2xl lg:rounded-full bg-muted/30 border border-border/60 px-3 py-2.5 text-xs font-bold text-foreground focus:border-[#ffcc00] focus:outline-none cursor-pointer pr-6"
              title="Driver Age"
            >
              <option value="25+">25+ yrs</option>
              <option value="21-24">21–24 yrs</option>
              <option value="18-20">18–20 yrs</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="shrink-0 flex items-center justify-center gap-2 px-4 h-11 lg:h-12 rounded-2xl lg:rounded-full bg-[#ffcc00] text-black font-black hover:bg-[#ffd700] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Search Cars"
          >
            <Search className="size-4 stroke-[3]" />
            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline lg:hidden">
              Search
            </span>
          </button>
        </div>
      </form>

      {/* ── Mini-Map Modal for Location Selection (Task 1.2) ── */}
      <UberInteractiveMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        title="Choose Pickup Branch or Doorstep Delivery"
        initialAddress={deliveryAddress || BRANCH_COORDS.address}
        onConfirmLocation={(data) => {
          if (data.distanceKm <= 0.8) {
            // Picked branch location
            setLocationMode("branch");
            setSelectedBranch(branches[0]);
            setDeliveryFee(0);
          } else {
            // Picked custom doorstep delivery location
            setLocationMode("delivery");
            setDeliveryAddress(data.address);
            setDeliveryFee(data.deliveryFee);
          }
          setMapOpen(false);
        }}
      />
    </div>
  );
}
