import {
  CalendarCheck,
  CalendarDays,
  Car,
  KeyRound,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { CustomerBookingsTable } from "@/components/customer/customer-bookings-table";
import { TripLifecycleTracker } from "@/components/customer/trip-lifecycle-tracker";
import { requireRole } from "@/lib/auth";
import { customerBookings } from "@/lib/data/bookings";
import { formatDate, formatTime } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function UserMyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("user");
  const params = await searchParams;
  const flash = readFlash(params);

  const search = searchParam(params, "search")?.toLowerCase() || "";
  const statusFilter = searchParam(params, "status") || "All";

  const allBookings = await customerBookings(session, session.userId);

  const totalBookings = allBookings.length;
  const activeRentals = allBookings.filter(
    (b) => b.status === "Confirmed" || b.status === "Released",
  ).length;
  const totalSpent = allBookings
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

  const filtered = allBookings.filter((b) => {
    if (statusFilter !== "All") {
      if (statusFilter === "Approved") {
        if (b.status !== "Confirmed" && b.status !== "Released") return false;
      } else if (b.status !== statusFilter) {
        return false;
      }
    }

    if (search) {
      const matchBrand = b.cars?.brand?.toLowerCase().includes(search);
      const matchModel = b.cars?.model?.toLowerCase().includes(search);
      const matchPlate = b.cars?.plate_number?.toLowerCase().includes(search);
      const matchId = String(b.id).includes(search);
      if (!matchBrand && !matchModel && !matchPlate && !matchId) return false;
    }

    return true;
  });

  return (
    <>
      <PageHeader
        title="My Bookings"
        subtitle="Trips & Reservations"
        description="View your past and current rental history, track approvals, and leave reviews."
        actions={
          <Link
            href="/user/cars"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            <Car className="size-4" />
            Book Another Car
          </Link>
        }
      />

      <Flash {...flash} />

      {/* KPI Tiles */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Bookings"
          value={totalBookings}
          hint="All time"
          icon={CalendarCheck}
        />
        <StatCard
          label="Active Rentals"
          value={activeRentals}
          hint="Ongoing or Confirmed"
          icon={KeyRound}
          tone="primary"
        />
        <StatCard
          label="Total Spent"
          value={<Money value={totalSpent} />}
          hint="Completed bookings"
          icon={TrendingUp}
        />
      </div>

      {/* Active Trip Tracker Card (if any active booking exists) */}
      {(() => {
        const activeTrip = allBookings.find(
          (b) => b.status === "Pending" || b.status === "Confirmed" || b.status === "Released",
        );
        if (!activeTrip) return null;

        const carName =
          [activeTrip.cars?.brand, activeTrip.cars?.model].filter(Boolean).join(" ") ||
          "Vehicle";

        return (
          <div className="mb-5 rounded-2xl border border-[#ffcc00]/40 bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#ffcc00]">
                    <Sparkles className="size-3.5" />
                    Current Booking Progress
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-xs font-bold text-foreground">
                    #BK-{activeTrip.id}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-extrabold text-foreground">
                  {carName} ({activeTrip.cars?.type || "Sedan"})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={activeTrip.status} />
                <Link
                  href={`/shared/booking_details?id=${activeTrip.id}`}
                  className="rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                >
                  View Full Details
                </Link>
              </div>
            </div>

            {/* Stepper */}
            <div className="pt-3">
              <TripLifecycleTracker status={activeTrip.status} />
            </div>
          </div>
        );
      })()}

      {/* Search & Filter */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Filter
          </button>
        }
      >
        <FilterField label="Search Vehicle or ID">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={searchParam(params, "search")}
              placeholder="e.g. Toyota, BK-12..."
              className={`${filterControlClass} pl-9`}
            />
          </div>
        </FilterField>

        <FilterField label="Status">
          <select
            name="status"
            defaultValue={statusFilter}
            className={filterControlClass}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Released">Released (Ongoing)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </FilterField>
      </FilterBar>

      {/* Bookings List */}
      <SectionCard>
        <CustomerBookingsTable bookings={filtered} />
      </SectionCard>
    </>
  );
}
