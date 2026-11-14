"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bed,
  CalendarDays,
  Car,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plane,
  Search,
  Building2,
  Truck,
  Check,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  UberInteractiveMapDialog,
  BRANCH_COORDS,
} from "@/components/common/uber-interactive-map";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface BranchOption {
  id: number;
  name: string;
  address?: string | null;
}

interface KayakHeroSearchProps {
  branches?: BranchOption[];
  className?: string;
  defaultDate?: string;
}

const DEFAULT_BRANCHES: BranchOption[] = [
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
];

const TIME_PRESETS = [
  { label: "08:00 AM", value: "08:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "01:00 PM", value: "13:00" },
  { label: "03:00 PM", value: "15:00" },
  { label: "06:00 PM", value: "18:00" },
  { label: "08:00 PM", value: "20:00" },
  { label: "10:00 PM", value: "22:00" },
];

const AGE_OPTIONS = [
  {
    value: "25+",
    title: "25+ years",
    description: "Standard rental tariff, fully insured",
  },
  {
    value: "21-24",
    title: "21–24 years",
    description: "Young driver coverage applies",
  },
  {
    value: "18-20",
    title: "18–20 years",
    description: "Junior driver authorization required",
  },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return dateStr;
    }
    const [year, month, day] = parts;
    const d = new Date(year, month - 1, day);
    const dayOfWeek = WEEKDAYS_SHORT[d.getDay()] || "";
    const monthName = MONTHS_SHORT[month - 1] || "";
    return `${dayOfWeek}, ${monthName} ${day}`;
  } catch {
    return dateStr;
  }
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return "";
  try {
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
}

/**
 * Custom Dark-Mode Date & Time Picker Popover
 * Completely replaces browser-native white popups with our sleek dark theme
 * and yellow accents (#ffcc00), with pristine Light Mode contrast.
 */
function CustomDateTimePicker({
  label,
  icon: Icon,
  date,
  time,
  minDate,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  date: string;
  time: string;
  minDate?: string;
  onDateChange: (newDate: string) => void;
  onTimeChange: (newTime: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  // Month navigation state
  const initialYear = date ? parseInt(date.slice(0, 4), 10) : new Date().getFullYear();
  const initialMonth = date ? parseInt(date.slice(5, 7), 10) - 1 : new Date().getMonth();
  const [navYear, setNavYear] = React.useState(initialYear);
  const [navMonth, setNavMonth] = React.useState(initialMonth);

  // Keep nav in sync when date prop changes
  React.useEffect(() => {
    if (date) {
      setNavYear(parseInt(date.slice(0, 4), 10));
      setNavMonth(parseInt(date.slice(5, 7), 10) - 1);
    }
  }, [date]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  // Calendar days grid calculation
  const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(navYear, navMonth, 1).getDay(); // 0 is Sunday

  const todayStr = React.useMemo(() => {
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }, []);

  const daysGrid: (string | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const padMonth = String(navMonth + 1).padStart(2, "0");
    const padDay = String(d).padStart(2, "0");
    daysGrid.push(`${navYear}-${padMonth}-${padDay}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 px-3 py-2 rounded-2xl lg:rounded-full bg-muted/20 hover:bg-muted/50 border border-border/40 hover:border-[#ffcc00]/60 transition-all text-left cursor-pointer group w-full"
        >
          <Icon className="size-4 text-muted-foreground group-hover:text-[#ffcc00] transition-colors shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground block">
              {label}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 truncate" suppressHydrationWarning>
              <span className="text-xs sm:text-sm font-black text-foreground" suppressHydrationWarning>
                {formatDisplayDate(date)}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground" suppressHydrationWarning>
                • {formatDisplayTime(time)}
              </span>
            </div>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform duration-200" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-[320px] sm:w-[340px] rounded-2xl border border-border bg-card/98 p-4 shadow-2xl backdrop-blur-xl text-card-foreground z-[200]"
      >
        {/* Header & Month Navigator */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:border-[#ffcc00] transition text-foreground cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="text-xs font-black text-foreground">
            {MONTH_NAMES[navMonth]} {navYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex size-7 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:border-[#ffcc00] transition text-foreground cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center text-[10px] font-extrabold text-muted-foreground uppercase">
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1">
          {daysGrid.map((dayStr, idx) => {
            if (!dayStr) {
              return <div key={`empty_${idx}`} className="size-8" />;
            }

            const dayNum = parseInt(dayStr.slice(8, 10), 10);
            const isSelected = dayStr === date;
            const isToday = dayStr === todayStr;
            const isPast = minDate ? dayStr < minDate : dayStr < todayStr;

            return (
              <button
                key={dayStr}
                type="button"
                disabled={isPast}
                onClick={(e) => {
                  e.preventDefault();
                  onDateChange(dayStr);
                }}
                className={cn(
                  "size-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer",
                  isSelected
                    ? "bg-[#ffcc00] text-black font-black shadow-md scale-105"
                    : isToday
                      ? "border border-[#ffcc00] text-foreground font-black hover:bg-muted"
                      : isPast
                        ? "text-muted-foreground/30 cursor-not-allowed opacity-30"
                        : "text-foreground hover:bg-muted hover:text-[#ffcc00]"
                )}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Custom Time Selector Pills */}
        <div className="mt-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="size-3 text-[#ffcc00]" />
              Pickup / Return Time
            </span>
            <span className="text-xs font-black text-amber-600 dark:text-[#ffcc00]">
              {formatDisplayTime(time)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {TIME_PRESETS.map((t) => {
              const isTimeSelected = time === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onTimeChange(t.value);
                  }}
                  className={cn(
                    "px-1.5 py-1 text-[10px] font-bold rounded-lg border transition-all text-center cursor-pointer",
                    isTimeSelected
                      ? "bg-[#ffcc00] text-black border-[#ffcc00] font-black shadow-xs"
                      : "border-border bg-background/50 hover:bg-muted text-foreground hover:border-[#ffcc00]/50"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Done / Close Button */}
        <div className="mt-3 pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-1.5 rounded-xl bg-[#ffcc00] text-black text-xs font-black hover:bg-[#ffd633] transition shadow-xs cursor-pointer text-center"
          >
            Apply &amp; Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Custom Dark-Mode Location Dropdown & Mini-Map Trigger
 * Completely replaces native browser popups with rich dark-theme list of branches
 * and doorstep delivery options.
 */
function CustomLocationDropdown({
  locationMode,
  selectedBranch,
  deliveryAddress,
  onOpenMap,
}: {
  locationMode: "branch" | "delivery";
  selectedBranch: BranchOption;
  deliveryAddress: string;
  onOpenMap: () => void;
}) {
  const displayLocation =
    locationMode === "branch"
      ? selectedBranch.name
      : deliveryAddress || "Set Doorstep Delivery Location";

  return (
    <button
      type="button"
      onClick={onOpenMap}
      className="lg:col-span-4 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl lg:rounded-full bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-[#ffcc00]/60 transition-all cursor-pointer group w-full text-left"
      aria-label="Click to open interactive map for branch or doorstep delivery"
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
            Open Map
          </span>
        </div>
        <p className="text-xs sm:text-sm font-black text-foreground truncate">
          {displayLocation}
        </p>
      </div>
      <div className="size-7 rounded-full bg-[#ffcc00]/10 flex items-center justify-center group-hover:bg-[#ffcc00] text-muted-foreground group-hover:text-black transition-colors shrink-0">
        <MapPin className="size-3.5" />
      </div>
    </button>
  );
}

/**
 * Custom Dark-Mode Driver Age Popover
 * Eliminates default white OS select popups.
 */
function CustomDriverAgePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (age: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const currentOption = AGE_OPTIONS.find((o) => o.value === value) || AGE_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-1 flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-2xl lg:rounded-full bg-muted/30 hover:bg-muted/60 border border-border/60 hover:border-[#ffcc00]/60 transition text-left cursor-pointer group"
        >
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-black tracking-wider text-muted-foreground block">
              Driver&apos;s Age
            </span>
            <span className="text-xs font-black text-foreground truncate block">
              {currentOption.value} yrs
            </span>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform duration-200" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[240px] rounded-2xl border border-border bg-card/98 p-2 shadow-2xl backdrop-blur-xl text-card-foreground z-[200] space-y-1"
      >
        <div className="px-2 py-1 border-b border-border/60">
          <p className="text-xs font-black text-foreground">Driver Age Requirement</p>
          <p className="text-[10px] text-muted-foreground">Select your age bracket</p>
        </div>

        {AGE_OPTIONS.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer",
                isSelected
                  ? "bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-foreground font-bold"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div>
                <p className="text-xs font-bold">{opt.title}</p>
                <p className="text-[10px] text-muted-foreground">{opt.description}</p>
              </div>
              {isSelected && <Check className="size-3.5 text-[#ffcc00] shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

/**
 * KayakHeroSearch — Tasks 1.1, 1.2
 * KAYAK-style search widget with:
 * - Category Tabs (Cars selected, Stays, Flights)
 * - Custom Dark-Mode Popover Date & Time pickers (no white browser popups)
 * - Custom Dark-Mode Location Dropdown & Interactive Mini-Map integration
 * - Custom Dark-Mode Driver's Age dropdown
 * - Prominent yellow search button
 * - Clean Light Mode & Dark Mode rendering across Mobile, Tablet, Laptop, and Desktop
 */
export function KayakHeroSearch({
  branches = DEFAULT_BRANCHES,
  className,
  defaultDate,
}: KayakHeroSearchProps) {
  const router = useRouter();

  // Category Tabs: Cars (selected) | Stays | Flights
  const [activeCategory, setActiveCategory] = React.useState<"cars" | "stays" | "flights">("cars");

  // Location & Fulfillment mode: "branch" or "delivery"
  const [locationMode, setLocationMode] = React.useState<"branch" | "delivery">("branch");
  const [selectedBranch, setSelectedBranch] = React.useState<BranchOption>(branches[0] || DEFAULT_BRANCHES[0]);
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [deliveryFee, setDeliveryFee] = React.useState(0);
  const [mapOpen, setMapOpen] = React.useState(false);

  // Deterministic Default Dates & Times (avoids UTC vs local SSR hydration mismatch)
  const defaultStart = defaultDate || "2026-11-15";
  const defaultEnd = React.useMemo(() => {
    try {
      const parts = defaultStart.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2] + 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return "2026-11-16";
    }
  }, [defaultStart]);

  const [startDate, setStartDate] = React.useState(defaultStart);
  const [startTime, setStartTime] = React.useState("10:00");
  const [endDate, setEndDate] = React.useState(defaultEnd);
  const [endTime, setEndTime] = React.useState("10:00");

  // Driver Age selection
  const [driverAge, setDriverAge] = React.useState("25+");

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

    // Smooth-scroll down to the availability schedule section
    router.push(`/#availability-schedule?${params.toString()}`);

    const scheduleEl =
      document.getElementById("availability-schedule") ||
      document.getElementById("fleet");
    if (scheduleEl) {
      scheduleEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={cn("w-full max-w-5xl mx-auto space-y-3", className)}>
      {/* ── Category Tabs: Cars (selected) / Stays / Flights (KAYAK signature layout) ── */}
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

        {/* Quick Mode Pill Switcher (Branch vs Delivery) */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setLocationMode("branch")}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-bold transition border cursor-pointer",
              locationMode === "branch"
                ? "bg-foreground/10 text-foreground border-foreground/25"
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
              "px-3 py-1 rounded-full text-[11px] font-bold transition border flex items-center gap-1 cursor-pointer",
              locationMode === "delivery"
                ? "bg-[#ffcc00]/20 text-[#b38a00] dark:text-[#ffcc00] border-[#ffcc00]/50"
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
        {/* 1. Location Segment: Interactive Mini-Map Trigger (Task 1.3) */}
        <CustomLocationDropdown
          locationMode={locationMode}
          selectedBranch={selectedBranch}
          deliveryAddress={deliveryAddress}
          onOpenMap={() => setMapOpen(true)}
        />

        {/* 2. Custom Pick-up Date & Time Picker */}
        <div className="lg:col-span-3">
          <CustomDateTimePicker
            label="Pick-up"
            icon={CalendarDays}
            date={startDate}
            time={startTime}
            onDateChange={setStartDate}
            onTimeChange={setStartTime}
          />
        </div>

        {/* 3. Custom Drop-off Date & Time Picker */}
        <div className="lg:col-span-3">
          <CustomDateTimePicker
            label="Drop-off"
            icon={Clock}
            date={endDate}
            time={endTime}
            minDate={startDate}
            onDateChange={setEndDate}
            onTimeChange={setEndTime}
          />
        </div>

        {/* 4. Driver's Age & Search Action Button */}
        <div className="lg:col-span-2 flex items-center gap-2">
          {/* Custom Dark-Mode Driver's Age Dropdown */}
          <CustomDriverAgePicker
            value={driverAge}
            onChange={setDriverAge}
          />

          {/* Yellow Search Action Button */}
          <button
            type="submit"
            className="shrink-0 flex items-center justify-center gap-2 px-5 h-11 lg:h-12 rounded-2xl lg:rounded-full bg-[#ffcc00] text-black font-black hover:bg-[#ffd633] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Search Available Vehicles"
          >
            <Search className="size-4 stroke-[3]" />
            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline lg:hidden">
              Search
            </span>
          </button>
        </div>
      </form>

      {/* ── Mini-Map Modal for Location Selection (Task 1.3) ── */}
      <UberInteractiveMapDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        title="Choose Pickup Branch or Doorstep Delivery"
        initialAddress={deliveryAddress || selectedBranch.address || BRANCH_COORDS.address}
        branches={branches}
        allowBranchSelection={true}
        initialMode={locationMode}
        onConfirmLocation={(data) => {
          if (data.mode === "branch" || data.distanceKm <= 0.8) {
            // Picked branch location
            setLocationMode("branch");
            if (data.branchId) {
              const matched = branches.find((b) => b.id === data.branchId);
              if (matched) setSelectedBranch(matched);
            } else {
              setSelectedBranch(branches[0] || DEFAULT_BRANCHES[0]);
            }
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
