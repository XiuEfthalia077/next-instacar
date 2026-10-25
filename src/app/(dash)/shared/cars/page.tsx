import {
  CalendarClock,
  Car,
  CarFront,
  CheckCircle2,
  Edit3,
  Fuel,
  Gauge,
  Images,
  MapPin,
  Search,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { CarGalleryDialog } from "@/components/admin/car-gallery-dialog";
import { EditCarDialog } from "@/components/admin/edit-car-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmSubmit } from "@/components/shared/confirm-submit";
import { CarImage } from "@/components/marketing/car-image";
import { deleteCarAction } from "@/lib/actions/cars";
import { getSupabase, requireSession } from "@/lib/auth";
import { carTypes, fleetCounters, listBranches, listCars } from "@/lib/data/cars";
import { fetchRows } from "@/lib/data/scope";
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

  const [counters, branches, types, fleet, operators] = await Promise.all([
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
    session.role === "admin"
      ? getSupabase().then((s) =>
          fetchRows<{ id: number; name: string | null }>(
            s
              .from("users")
              .select("id, name")
              .in("role", ["operator", "admin"])
              .order("name", { ascending: true }),
          ),
        )
      : Promise.resolve([]),
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
            className="h-10 rounded-xl bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
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
      <SectionCard title={`Fleet Inventory (${fleet.count} Vehicles)`} icon={CarFront}>
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
                  <th className="px-4 py-3.5 text-left font-bold">Vehicle</th>
                  <th className="px-3 py-3.5 text-left font-bold">Plate</th>
                  <th className="px-3 py-3.5 text-left font-bold">Branch / Owner</th>
                  <th className="px-3 py-3.5 text-left font-bold">Specifications</th>
                  <th className="px-3 py-3.5 text-right font-bold">Pricing</th>
                  <th className="px-3 py-3.5 text-center font-bold">Status</th>
                  <th className="px-4 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fleet.rows.map((car) => {
                  const carName =
                    [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
                  const imageList = car.image_path
                    ? car.image_path.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
                  const firstImg = imageList[0] || "default.png";
                  const imgUrl = carImageUrl(firstImg);

                  const isOwnerOrAdmin =
                    canManage && (session.role === "admin" || car.user_id === session.userId);

                  return (
                    <tr
                      key={car.id}
                      className="group transition-colors duration-150 hover:bg-muted/30"
                    >
                      {/* Vehicle Image & Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <CarGalleryDialog
                            carName={carName}
                            plateNumber={car.plate_number}
                            type={car.type}
                            imagePaths={imageList}
                            trigger={
                              <div
                                className="group/thumb relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition hover:scale-105 hover:border-[#ffcc00]"
                                title="Click to view image gallery"
                              >
                                <CarImage
                                  src={imgUrl}
                                  alt={carName}
                                  className="size-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover/thumb:opacity-100">
                                  <Images className="size-4 text-white" />
                                </div>
                              </div>
                            }
                          />

                          <div>
                            <p className="font-bold text-foreground group-hover:text-[#b38a00] dark:group-hover:text-[#ffcc00]">
                              {carName}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/80">
                                {car.type || "Sedan"}
                              </span>
                              {car.color ? <span>• {car.color}</span> : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* License Plate */}
                      <td className="px-3 py-3.5">
                        <span className="inline-block rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 font-mono text-xs font-bold text-foreground shadow-sm">
                          {car.plate_number ?? "—"}
                        </span>
                      </td>

                      {/* Branch & Owner */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                          <MapPin className="size-3 text-[#ffcc00]" />
                          <span>{car.branches?.name ?? "Unassigned"}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Owner: {car.users?.name || "Company Fleet"}
                        </p>
                      </td>

                      {/* Specs */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                            <Gauge className="size-3" />
                            {car.transmission || "Auto"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                            <Users className="size-3" />
                            {car.capacity || 5}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                            <Fuel className="size-3" />
                            {car.fuel_type || "Gas"}
                          </span>
                        </div>
                      </td>

                      {/* Rates */}
                      <td className="px-3 py-3.5 text-right">
                        <p className="font-extrabold text-foreground">
                          <Money value={car.price_24_hours} />
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                            /24h
                          </span>
                        </p>
                        {car.price_12_hours ? (
                          <p className="text-[11px] text-muted-foreground">
                            <Money value={car.price_12_hours} />
                            <span className="text-[10px]"> /12h</span>
                          </p>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 text-center">
                        <StatusBadge status={car.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Gallery Modal */}
                          <CarGalleryDialog
                            carName={carName}
                            plateNumber={car.plate_number}
                            type={car.type}
                            imagePaths={imageList}
                          />

                          {/* Edit Car Modal */}
                          {isOwnerOrAdmin ? (
                            <EditCarDialog
                              car={car}
                              branches={branches}
                              operators={operators}
                              isAdmin={session.role === "admin"}
                            />
                          ) : null}

                          {/* Schedule Button */}
                          <Link
                            href={`/shared/my_car_schedules?car_id=${car.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                            title="Manage Blockouts & Schedules"
                          >
                            <CalendarClock className="size-3.5" />
                            <span>Schedule</span>
                          </Link>

                          {/* Delete */}
                          {isOwnerOrAdmin ? (
                            <form action={deleteCarAction}>
                              <input type="hidden" name="id" value={car.id} />
                              <ConfirmSubmit
                                title="Delete Vehicle"
                                message={`Are you sure you want to delete ${carName} (${car.plate_number})? This action cannot be undone.`}
                                className="inline-flex size-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </ConfirmSubmit>
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
