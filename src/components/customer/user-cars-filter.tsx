"use client";

import { useId, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Car,
  Check,
  Info,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { MobileSearchPill, MobileSearchSheet } from "@/components/mobile/mobile-search-sheet";
import { cn } from "@/lib/utils";

interface UserCarsFilterProps {
  branches: Array<{ id: number; name: string }>;
  availableTypes: string[];
  totalFleetCount: number;
  matchingCount: number;
  displayedCount: number;
  search?: string;
  typeFilter?: string;
  branchFilter?: string;
  statusFilter?: string;
  perPage?: number;
  pickupDate?: string;
  returnDate?: string;
}

const CONTROL_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none transition-all duration-200 focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50 dark:bg-[#121417]";

const LABEL_CLASS =
  "mb-1.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground";

export function UserCarsFilter({
  branches,
  availableTypes,
  totalFleetCount,
  matchingCount,
  displayedCount,
  search = "",
  typeFilter = "All",
  branchFilter = "All",
  statusFilter = "All",
  perPage = 12,
  pickupDate = "",
  returnDate = "",
}: UserCarsFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  const handleFieldChange = (event: React.ChangeEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "SELECT" || target.getAttribute("type") === "date") {
      const form = event.currentTarget;
      startTransition(() => {
        form.requestSubmit();
      });
    }
  };

  const handleQuickChip = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/user/cars?${params.toString()}`, { scroll: false });
    });
  };

  const quickTypes = ["All", "SUV", "Sedan", "Van", "MPV"];

  return (
    <div className="mb-6 space-y-4">
      {/* 1. MOBILE-ONLY SEARCH PILL BAR (< 768px) */}
      <div className="md:hidden space-y-3">
        <MobileSearchPill
          onClick={() => setSearchSheetOpen(true)}
          placeholder={search || "Filter destination, model, dates..."}
        />

        {/* Sticky Horizontally Scrollable Filter Chips Strip */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1">
          {quickTypes.map((type) => {
            const isActive = (type === "All" && typeFilter === "All") || typeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleQuickChip("type", type)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition-all min-h-[44px] cursor-pointer",
                  isActive
                    ? "bg-[#ffcc00] text-black shadow-xs font-black"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{type === "All" ? "All Cars" : type}</span>
                {isActive && <Check className="size-3.5 stroke-[3]" />}
              </button>
            );
          })}

          {/* Quick Available Filter */}
          <button
            type="button"
            onClick={() => handleQuickChip("status", statusFilter === "Available" ? "All" : "Available")}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition-all min-h-[44px] cursor-pointer",
              statusFilter === "Available"
                ? "bg-[#ffcc00] text-black shadow-xs font-black"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>Available Now</span>
          </button>

          {/* Clear Filters Chip if any active */}
          {(search || typeFilter !== "All" || branchFilter !== "All" || statusFilter !== "All" || pickupDate || returnDate) && (
            <Link
              href="/user/cars"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition-all min-h-[44px]"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. DESKTOP HEADER & SEARCH BAR (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-1.5">
            <span>Vehicle</span>
            <span className="text-[#ffcc00]">Gallery</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Browse our fleet and check availability.
          </p>
        </div>

        {/* Search Bar - Top Right */}
        <form method="get" className="w-full sm:w-72 md:w-80">
          {typeFilter !== "All" && <input type="hidden" name="type" value={typeFilter} />}
          {branchFilter !== "All" && <input type="hidden" name="branch" value={branchFilter} />}
          {statusFilter !== "All" && <input type="hidden" name="status" value={statusFilter} />}
          {perPage !== 12 && <input type="hidden" name="per_page" value={perPage} />}
          {pickupDate && <input type="hidden" name="pickup_date" value={pickupDate} />}
          {returnDate && <input type="hidden" name="return_date" value={returnDate} />}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search brand, model, type..."
              className={cn(CONTROL_CLASS, "pl-9 text-xs")}
            />
          </div>
        </form>
      </div>

      {/* 3. MAIN FILTER CARD (Desktop & Tablet) */}
      <form
        id={formId}
        method="get"
        onChange={handleFieldChange}
        className={cn(
          "hidden md:block rounded-2xl border border-border bg-card/90 p-4 sm:p-5 shadow-xs transition-opacity duration-200",
          isPending && "opacity-60 pointer-events-none",
        )}
      >
        {search && <input type="hidden" name="search" value={search} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-3.5 sm:mb-4">
          <div>
            <label className={LABEL_CLASS}>
              <Car className="size-3.5 text-[#ffcc00]" />
              <span>Filter by Type</span>
            </label>
            <select name="type" defaultValue={typeFilter} className={CONTROL_CLASS}>
              <option value="All">All Types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              <MapPin className="size-3.5 text-[#ffcc00]" />
              <span>Filter by Branch</span>
            </label>
            <select name="branch" defaultValue={branchFilter} className={CONTROL_CLASS}>
              <option value="All">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              <Tag className="size-3.5 text-[#ffcc00]" />
              <span>Filter by Status</span>
            </label>
            <select name="status" defaultValue={statusFilter} className={CONTROL_CLASS}>
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Active">Active (Rented)</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              <SlidersHorizontal className="size-3.5 text-[#ffcc00]" />
              <span>Cars per Page</span>
            </label>
            <select name="per_page" defaultValue={String(perPage)} className={CONTROL_CLASS}>
              <option value="6">6 per page</option>
              <option value="12">12 per page</option>
              <option value="24">24 per page</option>
              <option value="48">48 per page</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-end mb-4">
          <div>
            <label className={LABEL_CLASS}>
              <CalendarDays className="size-3.5 text-[#ffcc00]" />
              <span>Pickup Date</span>
            </label>
            <input
              type="date"
              name="pickup_date"
              defaultValue={pickupDate}
              className={CONTROL_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>
              <CalendarDays className="size-3.5 text-[#ffcc00]" />
              <span>Return Date</span>
            </label>
            <input
              type="date"
              name="return_date"
              defaultValue={returnDate}
              className={CONTROL_CLASS}
            />
          </div>

          <div className="hidden lg:block" />

          <div>
            <Link
              href="/user/cars"
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-4 text-xs font-semibold text-muted-foreground transition hover:border-[#ffcc00] hover:text-foreground hover:bg-muted/40 shadow-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset All Filters</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Car className="size-3.5 text-[#ffcc00]" />
              Showing {displayedCount} of {matchingCount} matching vehicles
            </span>
            <span className="flex items-center gap-1.5">
              <Info className="size-3.5 text-muted-foreground" />
              Total fleet: {totalFleetCount} vehicles
            </span>
          </div>

          {(search || typeFilter !== "All" || branchFilter !== "All" || statusFilter !== "All" || pickupDate || returnDate) && (
            <span className="text-[11px] text-[#ffcc00] font-semibold">
              Filters active
            </span>
          )}
        </div>
      </form>

      {/* Mobile Search Bottom Sheet */}
      <MobileSearchSheet
        open={searchSheetOpen}
        onOpenChange={setSearchSheetOpen}
        initialSearch={search}
        initialType={typeFilter}
        initialLocation={branchFilter}
        initialPickupDate={pickupDate}
        initialReturnDate={returnDate}
      />
    </div>
  );
}
