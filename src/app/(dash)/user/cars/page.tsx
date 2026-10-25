import {
  Car,
  CheckCircle2,
  Fuel,
  Gauge,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { RentCarFlowDialog } from "@/components/customer/rent-car-flow-dialog";
import { CarImage } from "@/components/marketing/car-image";
import { requireRole } from "@/lib/auth";
import { listBranches, listCars } from "@/lib/data/cars";
import { siteContent } from "@/lib/data/misc";
import { readFlash, searchParam } from "@/lib/flash";
import { carImageUrl } from "@/lib/storage";

export const instant = false;

export default async function UserCarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("user");
  const params = await searchParams;
  const flash = readFlash(params);

  const search = searchParam(params, "search");
  const typeFilter = searchParam(params, "type") || "All";
  const branchFilterParam = searchParam(params, "branch");
  const branchId = branchFilterParam && branchFilterParam !== "All" ? Number(branchFilterParam) : undefined;

  const supabase = await import("@/lib/auth").then((m) => m.getSupabase());
  const todayStr = new Date().toISOString().slice(0, 10);

  const [branches, availableFleet, fleet, content, activeBookingsRes, activeSchedulesRes] = await Promise.all([
    listBranches(true),
    listCars(session, {
      branchId,
      perPage: 250,
    }),
    listCars(session, {
      search,
      type: typeFilter !== "All" ? typeFilter : undefined,
      branchId,
      perPage: 100,
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

  // Dynamic Car Type Extraction:
  // Must only show car types that currently have available cars in inventory.
  // MPV and Van are strictly separated.
  const dynamicAvailableTypes = Array.from(
    new Set(
      availableFleet.rows
        .filter((c) => c.status === "Available" || c.status === "Active")
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

  const cars = fleet.rows.filter(
    (c) => c.status === "Available" || c.status === "Active",
  );

  return (
    <>
      <PageHeader
        title="Vehicle Gallery"
        subtitle="Available Fleet"
        description="Choose from our premium and economy fleet with clear 10h, 12h, and 24h rates."
      />

      <Flash {...flash} />

      {/* Filter bar */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-[10px] bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Apply Filters
          </button>
        }
      >
        <FilterField label="Search Vehicle">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="e.g. Vios, Innova..."
              className={`${filterControlClass} pl-9`}
            />
          </div>
        </FilterField>

        <FilterField label="Car Type">
          <select
            name="type"
            defaultValue={typeFilter}
            className={filterControlClass}
          >
            <option value="All">All Types</option>
            {dynamicAvailableTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Branch Location">
          <select
            name="branch"
            defaultValue={branchFilterParam || "All"}
            className={filterControlClass}
          >
            <option value="All">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      {/* Car Gallery Grid */}
      {cars.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No Vehicles Available"
          description="No vehicles matched your filter criteria. Try adjusting your search or branch."
          action={
            <Link
              href="/user/cars"
              className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-4 py-2 text-sm font-bold text-black"
            >
              Reset Filters
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => {
            const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
            const firstImg = car.image_path ? car.image_path.split(",")[0].trim() : "default.png";
            const imgUrl = carImageUrl(firstImg);

            return (
              <div
                key={car.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:border-[#ffcc00]/50 hover:shadow-lg"
              >
                {/* Image header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  <CarImage
                    src={imgUrl}
                    alt={carName}
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                      {car.type || "Sedan"}
                    </span>
                    {car.branches?.name ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#ffcc00] px-2.5 py-0.5 text-[11px] font-bold text-black">
                        <MapPin className="size-3" />
                        {car.branches.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <StatusBadge status={car.status} />
                  </div>
                </div>

                {/* Car details */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground text-base group-hover:text-[#b38a00]">
                        {carName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {car.type || "Sedan"} • {car.fuel_type || "Gasoline"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-foreground">
                        <Money value={car.price_24_hours} />
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                        per 24 hours
                      </p>
                    </div>
                  </div>

                  {/* Feature chips */}
                  <div className="my-3 grid grid-cols-3 gap-2 border-y border-border py-2.5 text-center text-xs text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Gauge className="size-3.5 mb-1 text-foreground" />
                      <span>{car.transmission || "Auto"}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Users className="size-3.5 mb-1 text-foreground" />
                      <span>{car.capacity || 5} Seats</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Fuel className="size-3.5 mb-1 text-foreground" />
                      <span>{car.fuel_type || "Gasoline"}</span>
                    </div>
                  </div>

                  {/* Alternative pricing */}
                  <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>10 hrs: <strong><Money value={car.price_10_hours} /></strong></span>
                    <span>12 hrs: <strong><Money value={car.price_12_hours} /></strong></span>
                  </div>

                  {/* Action button */}
                  <div className="mt-auto">
                    <RentCarFlowDialog
                      car={car}
                      agreementHtml={content.rental_agreement_html ?? ""}
                      blockedRanges={blockedDatesByCar[car.id] || []}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
