import { Car } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { TablePagination } from "@/components/common/data-table";
import { UserCarCard } from "@/components/customer/user-car-card";
import { UserCarsFilter } from "@/components/customer/user-cars-filter";
import { requireRole } from "@/lib/auth";
import { listBranches, listCars } from "@/lib/data/cars";
import { siteContent } from "@/lib/data/misc";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function UserCarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("user", "admin", "staff");
  const params = await searchParams;
  const flash = readFlash(params);

  // Read filter parameters
  const search = (searchParam(params, "search") || "").trim();
  const typeFilter = searchParam(params, "type") || "All";
  const branchFilterParam = searchParam(params, "branch") || "All";
  const statusFilter = searchParam(params, "status") || "All";
  const perPageParam = Number.parseInt(searchParam(params, "per_page") || "12", 10);
  const perPage = Number.isFinite(perPageParam) && perPageParam > 0 ? perPageParam : 12;
  const pageParam = Number.parseInt(searchParam(params, "page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pickupDate = searchParam(params, "pickup_date") || "";
  const returnDate = searchParam(params, "return_date") || "";

  const branchId =
    branchFilterParam !== "All" && Number.isFinite(Number(branchFilterParam))
      ? Number(branchFilterParam)
      : undefined;

  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch branches, full active fleet, site content, and schedules
  const [branches, fleetRes, content, activeBookingsRes, activeSchedulesRes] =
    await Promise.all([
      listBranches(true),
      listCars(session, {
        perPage: 500, // Fetch full fleet to support rich client-matching and counters
      }),
      siteContent(),
      supabase
        .from("bookings")
        .select("car_id, start_date, end_date, status")
        .in("status", ["Pending", "Confirmed", "Released"])
        .gte("end_date", todayStr),
      supabase
        .from("car_schedules")
        .select("car_id, start_date, end_date, reason")
        .gte("end_date", todayStr),
    ]);

  const allFleet = fleetRes.rows.filter(
    (c) => c.status === "Available" || c.status === "Active",
  );

  const activeBookings = (activeBookingsRes.data || []) as Array<{
    car_id: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
  }>;

  const activeSchedules = (activeSchedulesRes.data || []) as Array<{
    car_id: number;
    start_date: string;
    end_date: string;
    reason: string;
  }>;

  // Build blocked dates lookup per car for the booking dialog
  const blockedDatesByCar: Record<
    number,
    Array<{ start: string; end: string; reason: "Booked" | "Maintenance" }>
  > = {};

  for (const b of activeBookings) {
    if (!b.start_date || !b.end_date) continue;
    if (!blockedDatesByCar[b.car_id]) blockedDatesByCar[b.car_id] = [];
    blockedDatesByCar[b.car_id].push({
      start: b.start_date,
      end: b.end_date,
      reason: "Booked",
    });
  }

  for (const s of activeSchedules) {
    if (!blockedDatesByCar[s.car_id]) blockedDatesByCar[s.car_id] = [];
    blockedDatesByCar[s.car_id].push({
      start: s.start_date,
      end: s.end_date,
      reason: "Maintenance",
    });
  }

  // Dynamic Car Types: MPV and Van strictly separated
  const availableTypes = Array.from(
    new Set(
      allFleet
        .flatMap((c) => {
          if (!c.type) return [];
          const trimmed = c.type.trim();
          if (trimmed === "MPV / Van" || trimmed === "MPV/Van") {
            return ["MPV", "Van"];
          }
          return [trimmed];
        })
        .filter((t): t is string => Boolean(t) && t.length > 0),
    ),
  ).sort();

  // Filter cars based on criteria
  const targetDateStart = pickupDate || returnDate;
  const targetDateEnd = returnDate || pickupDate;
  const hasDateFilter = Boolean(targetDateStart && targetDateEnd);

  const filteredCars = allFleet.filter((car) => {
    // 1. Branch Filter
    if (branchId !== undefined && car.branch_id !== branchId) {
      return false;
    }

    // 2. Type Filter (handling MPV / Van separation)
    if (typeFilter !== "All") {
      const carTypeLower = (car.type || "").toLowerCase();
      const filterLower = typeFilter.toLowerCase();

      if (filterLower === "mpv") {
        if (!carTypeLower.includes("mpv")) return false;
      } else if (filterLower === "van") {
        if (!carTypeLower.includes("van")) return false;
      } else {
        if (carTypeLower !== filterLower) return false;
      }
    }

    // 3. Status Filter
    if (statusFilter !== "All") {
      if (car.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }

    // 4. Search Filter
    if (search) {
      const term = search.toLowerCase();
      const brandMatch = (car.brand || "").toLowerCase().includes(term);
      const modelMatch = (car.model || "").toLowerCase().includes(term);
      const typeMatch = (car.type || "").toLowerCase().includes(term);
      if (!brandMatch && !modelMatch && !typeMatch) {
        return false;
      }
    }

    // 5. Date Range Availability Filter
    if (hasDateFilter) {
      const carBlocked = blockedDatesByCar[car.id] || [];
      const hasConflict = carBlocked.some((range) => {
        return range.start <= targetDateEnd && range.end >= targetDateStart;
      });
      if (hasConflict) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const matchingCount = filteredCars.length;
  const totalPages = Math.max(1, Math.ceil(matchingCount / perPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * perPage;
  const paginatedCars = filteredCars.slice(startIndex, startIndex + perPage);

  // Helper for pagination links
  const paginationQuery = (p: number) => {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (typeFilter !== "All") q.set("type", typeFilter);
    if (branchFilterParam !== "All") q.set("branch", branchFilterParam);
    if (statusFilter !== "All") q.set("status", statusFilter);
    if (perPage !== 12) q.set("per_page", String(perPage));
    if (pickupDate) q.set("pickup_date", pickupDate);
    if (returnDate) q.set("return_date", returnDate);
    if (p > 1) q.set("page", String(p));
    const str = q.toString();
    return `/user/cars${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <Flash {...flash} />

      {/* Strict Filter Layout Matching Attached Screenshot */}
      <UserCarsFilter
        branches={branches}
        availableTypes={availableTypes}
        totalFleetCount={allFleet.length}
        matchingCount={matchingCount}
        displayedCount={paginatedCars.length}
        search={search}
        typeFilter={typeFilter}
        branchFilter={branchFilterParam}
        statusFilter={statusFilter}
        perPage={perPage}
        pickupDate={pickupDate}
        returnDate={returnDate}
      />

      {/* Vehicle Gallery Grid */}
      {paginatedCars.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No Vehicles Available"
          description="No vehicles matched your filter criteria or selected rental window. Try adjusting your search, dates, or branch."
          action={
            <Link
              href="/user/cars"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2 text-xs font-black text-black shadow-md hover:bg-[#ffd633]"
            >
              Reset Filters
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCars.map((car) => (
            <UserCarCard
              key={car.id}
              car={car}
              agreementHtml={content.rental_agreement_html ?? ""}
              blockedRanges={blockedDatesByCar[car.id] || []}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-4">
          <TablePagination
            page={safePage}
            pageSize={perPage}
            total={matchingCount}
            buildHref={paginationQuery}
          />
        </div>
      )}
    </div>
  );
}
