import {
  CalendarCheck,
  CalendarDays,
  Car,
  KeyRound,
  Search,
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
        {filtered.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No Bookings Found"
            description={
              search || statusFilter !== "All"
                ? "Try clearing your search or status filter."
                : "You have not made any bookings yet."
            }
            action={
              <Link
                href="/user/cars"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2 text-sm font-bold text-black"
              >
                Browse Fleet
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3 text-left font-bold">Booking ID</th>
                  <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                  <th className="px-3 py-3 text-left font-bold">Trip Dates</th>
                  <th className="px-3 py-3 text-left font-bold">Pickup Time</th>
                  <th className="px-3 py-3 text-left font-bold">Total</th>
                  <th className="px-3 py-3 text-center font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => {
                  const carName =
                    [booking.cars?.brand, booking.cars?.model]
                      .filter(Boolean)
                      .join(" ") || "Vehicle";

                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-3 font-semibold text-foreground">
                        #BK-{booking.id}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{carName}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.cars?.plate_number ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-foreground">
                          <CalendarDays className="size-3.5 text-muted-foreground" />
                          <span>
                            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatTime(booking.pickup_time)}
                      </td>
                      <td className="px-3 py-3 font-bold text-foreground">
                        <Money value={booking.total_price} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/shared/booking_details?id=${booking.id}`}
                            className="inline-flex items-center rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                          >
                            Details
                          </Link>
                          {booking.status === "Completed" ? (
                            <Link
                              href={`/shared/booking_details?id=${booking.id}#reviews`}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            >
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              Review
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
