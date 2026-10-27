"use client";

import { useId, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Car,
  Info,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import Link from "next/link";
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
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none transition-all duration-200 focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50 dark:bg-[#121417]";

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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  const handleFieldChange = (event: React.ChangeEvent<HTMLFormElement>) => {
    // Only auto-submit select dropdowns and date inputs on change
    const target = event.target as HTMLElement;
    if (target.tagName === "SELECT" || target.getAttribute("type") === "date") {
      const form = event.currentTarget;
      startTransition(() => {
        form.requestSubmit();
      });
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {/* 1. TOP HEADER WITH TITLE & SEARCH BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          {/* Preserve current filters while searching */}
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
              placeholder="Search this page: brand, model, type..."
              className={cn(CONTROL_CLASS, "pl-9 text-xs")}
            />
          </div>
        </form>
      </div>

      {/* 2. MAIN FILTER CARD (EXACT LAYOUT MATCH) */}
      <form
        id={formId}
        method="get"
        onChange={handleFieldChange}
        className={cn(
          "rounded-2xl border border-border bg-card/90 p-4 sm:p-5 shadow-xs transition-opacity duration-200",
          isPending && "opacity-60 pointer-events-none",
        )}
      >
        {/* Preserve search text if active */}
        {search && <input type="hidden" name="search" value={search} />}

        {/* TOP ROW: 4 Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-3.5 sm:mb-4">
          {/* 1. FILTER BY TYPE */}
          <div>
            <label className={LABEL_CLASS}>
              <Car className="size-3.5 text-[#ffcc00]" />
              <span>Filter by Type</span>
            </label>
            <select
              name="type"
              defaultValue={typeFilter}
              className={CONTROL_CLASS}
            >
              <option value="All">All Types</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 2. FILTER BY BRANCH */}
          <div>
            <label className={LABEL_CLASS}>
              <MapPin className="size-3.5 text-[#ffcc00]" />
              <span>Filter by Branch</span>
            </label>
            <select
              name="branch"
              defaultValue={branchFilter}
              className={CONTROL_CLASS}
            >
              <option value="All">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. FILTER BY STATUS */}
          <div>
            <label className={LABEL_CLASS}>
              <Tag className="size-3.5 text-[#ffcc00]" />
              <span>Filter by Status</span>
            </label>
            <select
              name="status"
              defaultValue={statusFilter}
              className={CONTROL_CLASS}
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Active">Active (Rented)</option>
            </select>
          </div>

          {/* 4. CARS PER PAGE */}
          <div>
            <label className={LABEL_CLASS}>
              <SlidersHorizontal className="size-3.5 text-[#ffcc00]" />
              <span>Cars per Page</span>
            </label>
            <select
              name="per_page"
              defaultValue={String(perPage)}
              className={CONTROL_CLASS}
            >
              <option value="6">6 per page</option>
              <option value="12">12 per page</option>
              <option value="24">24 per page</option>
              <option value="48">48 per page</option>
            </select>
          </div>
        </div>

        {/* MIDDLE ROW: Date Pickers + Reset Button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-end mb-4">
          {/* PICKUP DATE */}
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

          {/* RETURN DATE */}
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

          {/* Spacer Column */}
          <div className="hidden lg:block" />

          {/* RESET ALL FILTERS BUTTON */}
          <div>
            <Link
              href="/user/cars"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-muted-foreground transition hover:border-[#ffcc00] hover:text-foreground hover:bg-muted/40 shadow-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset All Filters</span>
            </Link>
          </div>
        </div>

        {/* BOTTOM ROW: Text Counters */}
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
    </div>
  );
}
