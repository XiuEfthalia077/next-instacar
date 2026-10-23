import {
  Car,
  CarFront,
  CheckCircle2,
  Search,
  Trash2,
  Wrench,
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
import { CarImage } from "@/components/marketing/car-image";
import { deleteCarAction } from "@/lib/actions/cars";
import { requireSession } from "@/lib/auth";
import { carTypes, fleetCounters, listBranches, listCars } from "@/lib/data/cars";
import { readFlash, searchParam } from "@/lib/flash";
import { carImageUrl } from "@/lib/storage";

export const instant = false;

export default async function SharedCarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const flash = readFlash(params);

  const search = searchParam(params, "search");
  const typeFilter = searchParam(params, "type") || "all";
  const statusFilter = searchParam(params, "status") || "all";
  const branchFilterParam = searchParam(params, "branch");
  const branchId =
    branchFilterParam && branchFilterParam !== "all"
      ? Number(branchFilterParam)
      : undefined;

  const [counters, branches, types, fleet] = await Promise.all([
    fleetCounters(session),
    listBranches(true),
    carTypes(session),
    listCars(session, {
      search,
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      branchId,
      ownerId: session.role === "operator" ? session.userId : undefined,
      perPage: 100,
    }),
  ]);

  const canManage = session.role === "admin" || session.role === "operator";

  return (
    <>
      <PageHeader
        title="Fleet Management"
        subtitle="Vehicles & Inventory"
        description="View and manage the vehicle fleet, rental pricing, and maintenance status."
      />

      <Flash {...flash} />

      {/* KPI Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Fleet"
          value={counters.total}
          hint="All registered vehicles"
          icon={CarFront}
        />
        <StatCard
          label="Available"
          value={counters.available}
          hint="Ready for rental"
          icon={CheckCircle2}
          tone="primary"
        />
        <StatCard
          label="Currently Rented"
          value={counters.rented}
          hint="On active trip"
          icon={Car}
        />
        <StatCard
          label="Maintenance"
          value={counters.maintenance}
          hint="Service / repair"
          icon={Wrench}
        />
      </div>

      {/* Filters */}
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
        <FilterField label="Search Vehicle">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Brand, model, or plate..."
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
            <option value="all">All Vehicle Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Status">
          <select
            name="status"
            defaultValue={statusFilter}
            className={filterControlClass}
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Active">Active (Rented)</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Not Available">Not Available</option>
            <option value="Reserved">Reserved</option>
          </select>
        </FilterField>

        {session.role === "admin" ? (
          <FilterField label="Branch">
            <select
              name="branch"
              defaultValue={branchFilterParam || "all"}
              className={filterControlClass}
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </FilterField>
        ) : null}
      </FilterBar>

      {/* Fleet Table */}
      <SectionCard title={`Vehicles (${fleet.count})`} icon={CarFront}>
        {fleet.rows.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title="No Vehicles Found"
            description="No vehicles matched your filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                  <th className="px-3 py-3 text-left font-bold">Plate</th>
                  <th className="px-3 py-3 text-left font-bold">Branch / Owner</th>
                  <th className="px-3 py-3 text-left font-bold">Specs</th>
                  <th className="px-3 py-3 text-right font-bold">24h Rate</th>
                  <th className="px-3 py-3 text-center font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fleet.rows.map((car) => {
                  const carName =
                    [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
                  const firstImg = car.image_path
                    ? car.image_path.split(",")[0].trim()
                    : "default.png";
                  const imgUrl = carImageUrl(firstImg);

                  return (
                    <tr
                      key={car.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <CarImage
                              src={imgUrl}
                              alt={carName}
                              className="size-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{carName}</p>
                            <p className="text-xs text-muted-foreground">
                              {car.type || "Sedan"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold text-foreground">
                          {car.plate_number ?? "—"}
                        </code>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-foreground">
                          {car.branches?.name ?? "—"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Owner: {car.users?.name || "Company Fleet"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {car.transmission || "Auto"} • {car.capacity || 5} Seats • {car.fuel_type || "Gas"}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-foreground">
                        <Money value={car.price_24_hours} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={car.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/shared/my_car_schedules?car_id=${car.id}`}
                            className="inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                          >
                            Schedule
                          </Link>
                          {canManage && (session.role === "admin" || car.user_id === session.userId) ? (
                            <form action={deleteCarAction}>
                              <input type="hidden" name="id" value={car.id} />
                              <button
                                type="submit"
                                className="inline-flex size-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </form>
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
