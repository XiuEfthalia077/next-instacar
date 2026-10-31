import {
  Building2,
  CalendarClock,
  Camera,
  Car,
  CarFront,
  CheckCircle2,
  Clock,
  Cog,
  Edit3,
  Fuel,
  Gauge,
  Images,
  MapPin,
  Plus,
  Search,
  Store,
  Trash2,
  User,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { CarGalleryDialog } from "@/components/admin/car-gallery-dialog";
import { EditCarDialog } from "@/components/admin/edit-car-dialog";
import { RegisterCarDialog } from "@/components/admin/register-car-dialog";
import { EmptyState } from "@/components/common/empty-state";
import {
  FilterBar,
  FilterField,
  FilterSubmitButton,
  FilterResetButton,
  filterControlClass,
} from "@/components/common/filter-bar";
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
import { getAdminClient } from "@/lib/supabase-admin";

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
      ? (async () => {
          const client = getAdminClient() ?? (await getSupabase());
          return fetchRows<{ id: number; name: string | null; email?: string | null }>(
            client
              .from("users")
              .select("id, name, email")
              .eq("role", "operator")
              .order("name", { ascending: true }),
          );
        })()
      : Promise.resolve([]),
  ]);

  const canManage = session.role === "admin" || session.role === "operator";

  return (
    <>
      <PageHeader
        title="Fleet Management"
        subtitle="Vehicles & Inventory"
        description="View and manage the vehicle fleet, rental pricing, tariffs, and maintenance status."
        actions={
          canManage ? (
            <RegisterCarDialog
              branches={branches}
              operators={operators}
            />
          ) : undefined
        }
      />

      <Flash {...flash} />

      {/* KPI Stats */}
      <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4 w-full">
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
          <>
            <FilterSubmitButton />
            <FilterResetButton href="/shared/cars" />
          </>
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

      {/* Fleet Table (Matching Image 4 Layout) */}
      <SectionCard title={`Fleet Inventory (${fleet.count} Vehicles)`} icon={CarFront} bodyClassName="p-0">
        {fleet.rows.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title="No Vehicles Found"
            description="No vehicles matched your filter parameters."
          />
        ) : (
          <>
            {/* Mobile View: Stackable Vehicle Cards (< md) */}
            <div className="space-y-3.5 p-3 sm:p-4 md:hidden">
              {fleet.rows.map((car) => {
                const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
                const imageList = car.image_path ? car.image_path.split(",").map((s) => s.trim()).filter(Boolean) : [];
                const firstImg = imageList[0] || "default.png";
                const imgUrl = carImageUrl(firstImg);
                const isOwnerOrAdmin = canManage && (session.role === "admin" || car.user_id === session.userId);
                const isAssignedToOperator = Boolean(car.user_id && car.users?.role === "operator");
                const ownerName = isAssignedToOperator ? (car.users?.name || "Operator") : "Company";

                return (
                  <div
                    key={car.id}
                    className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                        <img
                          src={imgUrl}
                          alt={carName}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <p className="font-extrabold text-sm text-foreground truncate">{carName}</p>
                          <StatusBadge status={car.status || "Available"} className="text-[10px] px-2 py-0.5" />
                        </div>
                        <p className="font-mono text-xs font-bold text-muted-foreground mt-0.5">
                          {car.plate_number ?? "No Plate"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Owner: <span className="font-semibold text-foreground">{ownerName}</span> &bull; {car.branches?.name || "All Branches"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-2.5 text-xs border border-border/40">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rates</span>
                        <span className="font-bold text-foreground">
                          <Money value={car.price_24_hours ?? 0} /> <span className="text-[10px] text-muted-foreground font-normal">/ 24h</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Specs</span>
                        <span className="text-foreground">
                          {car.type || "Sedan"} &bull; {car.transmission || "Auto"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <Link
                        href={`/shared/my_car_schedules?car_id=${car.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ffcc00] hover:underline min-h-[36px]"
                      >
                        <CalendarClock className="size-3.5" />
                        <span>Schedules</span>
                      </Link>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <CarGalleryDialog
                          carId={car.id}
                          carName={carName}
                          plateNumber={car.plate_number}
                          type={car.type}
                          imagePaths={imageList}
                          canManage={isOwnerOrAdmin}
                        />
                        {isOwnerOrAdmin ? (
                          <EditCarDialog
                            car={car}
                            branches={branches}
                            operators={operators}
                            isAdmin={session.role === "admin"}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Full Spreadsheet Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3.5 py-3 text-left font-extrabold">Vehicle</th>
                  <th className="px-3 py-3 text-left font-extrabold">Owner</th>
                  <th className="px-3 py-3 text-left font-extrabold">Branch</th>
                  <th className="px-3 py-3 text-left font-extrabold">Specs</th>
                  <th className="px-3 py-3 text-left font-extrabold">Plate No.</th>
                  <th className="px-3 py-3 text-left font-extrabold">Rates &amp; Splits (10h / 12h / 24h)</th>
                  <th className="px-3 py-3 text-left font-extrabold">Overtime Rates</th>
                  <th className="px-3 py-3 text-center font-extrabold">Status</th>
                  <th className="px-3.5 py-3 text-right font-extrabold">Actions</th>
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

                  const isAssignedToOperator = Boolean(car.user_id && car.users?.role === "operator");
                  const ownerName = isAssignedToOperator ? (car.users?.name || "Operator") : "Company";

                  return (
                    <tr
                      key={car.id}
                      className="group transition-colors duration-150 hover:bg-muted/30"
                    >
                      {/* VEHICLE: Thumbnail + Camera Badge + Brand/Model + Type Badge */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-3">
                          <CarGalleryDialog
                            carId={car.id}
                            carName={carName}
                            plateNumber={car.plate_number}
                            type={car.type}
                            imagePaths={imageList}
                            canManage={isOwnerOrAdmin}
                            trigger={
                              <div
                                className="group/thumb relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-black/60 shadow-sm transition hover:scale-105 hover:border-[#ffcc00]"
                                title="Click to view image gallery"
                              >
                                <CarImage
                                  src={imgUrl}
                                  alt={carName}
                                  className="size-full object-cover"
                                />
                                <div className="absolute bottom-1 right-1 rounded bg-black/70 p-0.5 text-white">
                                  <Camera className="size-3 text-amber-300" />
                                </div>
                              </div>
                            }
                          />

                          <div>
                            <p className="font-extrabold text-foreground group-hover:text-[#ffcc00] text-sm">
                              {carName}
                            </p>
                            <span className="inline-block mt-0.5 rounded border border-border/80 bg-muted/60 px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground uppercase">
                              {car.type || "Sedan"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* OWNER: Icon + Operator Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <User className="size-3.5 text-muted-foreground" />
                          <span>{ownerName}</span>
                        </div>
                      </td>

                      {/* BRANCH: Building Icon + Pill */}
                      <td className="px-3 py-3">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
                          <Store className="size-3.5 text-muted-foreground" />
                          <span>{car.branches?.name ?? "Main Branch"}</span>
                        </div>
                      </td>

                      {/* SPECS: Cog + Transmission, Users + Seats & Color */}
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-foreground">
                            <Cog className="size-3.5 text-amber-400" />
                            <span className="font-semibold">{car.transmission || "Automatic"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                            <Users className="size-3 text-muted-foreground" />
                            <span>
                              {car.capacity || 5} Seats {car.color ? `• ${car.color}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PLATE NO: Pill */}
                      <td className="px-3 py-3">
                        <span className="inline-block rounded-lg border border-border bg-card px-2 py-1 font-mono text-xs font-bold text-foreground shadow-xs">
                          {car.plate_number ?? "—"}
                        </span>
                      </td>

                      {/* RATES & SPLITS (10H / 12H / 24H) */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">10h: <strong className="text-foreground"><Money value={car.price_10_hours ?? 0} /></strong></span>
                            <span className="text-emerald-500 font-bold">Op: <Money value={car.operator_10_hours ?? 0} /></span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">12h: <strong className="text-foreground"><Money value={car.price_12_hours ?? 0} /></strong></span>
                            <span className="text-emerald-500 font-bold">Op: <Money value={car.operator_12_hours ?? 0} /></span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-extrabold text-[#ffcc00]">24h: <strong className="text-foreground"><Money value={car.price_24_hours ?? 0} /></strong></span>
                            <span className="text-emerald-500 font-bold">Op: <Money value={car.operator_24_hours ?? 0} /></span>
                          </div>
                        </div>
                      </td>

                      {/* OVERTIME / EXTENSION RATES (with bold price + "per hour" for 1-6h) */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">1-6 hrs:</span>
                            <span className="font-extrabold text-foreground">
                              ₱{car.ext_price_1_6 ?? 0}/hr
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-muted-foreground">
                            <span>7-10 hrs:</span>
                            <span>₱{car.ext_price_7_10 ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-muted-foreground">
                            <span>11-12 hrs:</span>
                            <span>₱{car.ext_price_11_12 ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-muted-foreground">
                            <span>13-24 hrs:</span>
                            <span>₱{car.ext_price_13_24 ?? 0}</span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS (Operational Status: Active, Available, Maintenance) */}
                      <td className="px-3 py-3 text-center">
                        <StatusBadge
                          status={car.status || "Available"}
                          className="rounded-full px-3 py-1 text-[11px] font-extrabold"
                        />
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Car Modal */}
                          {isOwnerOrAdmin ? (
                            <EditCarDialog
                              car={car}
                              branches={branches}
                              operators={operators}
                              isAdmin={session.role === "admin"}
                            />
                          ) : null}

                          {/* Gallery Modal */}
                          <CarGalleryDialog
                            carId={car.id}
                            carName={carName}
                            plateNumber={car.plate_number}
                            type={car.type}
                            imagePaths={imageList}
                            canManage={isOwnerOrAdmin}
                          />

                          {/* Schedule Button */}
                          <Link
                            href={`/shared/my_car_schedules?car_id=${car.id}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                            title="Manage Blockouts & Schedules"
                          >
                            <CalendarClock className="size-4" />
                          </Link>

                          {/* Delete */}
                          {isOwnerOrAdmin ? (
                            <form action={deleteCarAction}>
                              <input type="hidden" name="id" value={car.id} />
                              <ConfirmSubmit
                                title="Delete Vehicle"
                                message={`Are you sure you want to delete ${carName} (${car.plate_number})? This action cannot be undone.`}
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-rose-500 transition hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
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
        </>
      )}
    </SectionCard>
    </>
  );
}
