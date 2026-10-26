import {
  CalendarDays,
  CalendarRange,
  PlusCircle,
  Trash2,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteScheduleAction, saveScheduleAction } from "@/lib/actions/cars";
import { getSupabase, requireRole } from "@/lib/auth";
import { listCars } from "@/lib/data/cars";
import { formatDate } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function SharedMyCarSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("admin", "operator");
  const params = await searchParams;
  const flash = readFlash(params);

  const carFilterParam = searchParam(params, "car_id");
  const selectedCarId = carFilterParam && carFilterParam !== "all" ? Number(carFilterParam) : undefined;

  // Fetch cars owned or visible
  const fleet = await listCars(session, {
    ownerId: session.role === "operator" ? session.userId : undefined,
    perPage: 100,
  });

  const supabase = await getSupabase();
  let schedQuery = supabase
    .from("car_schedules")
    .select(
      `
      id, car_id, start_date, end_date, reason, notes, created_at,
      cars!car_schedules_car_id_fkey ( id, brand, model, plate_number, user_id )
    `,
    )
    .order("start_date", { ascending: false });

  if (selectedCarId) {
    schedQuery = schedQuery.eq("car_id", selectedCarId);
  }

  if (session.role === "operator") {
    schedQuery = schedQuery.eq("cars.user_id", session.userId);
  }

  const { data: schedulesData } = await schedQuery;

  const schedules = ((schedulesData ?? []) as unknown as {
    id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    reason: string;
    notes: string | null;
    created_at: string;
    cars:
      | { id: number; brand: string | null; model: string | null; plate_number: string | null }
      | { id: number; brand: string | null; model: string | null; plate_number: string | null }[]
      | null;
  }[]).map((s) => ({
    ...s,
    cars: Array.isArray(s.cars) ? s.cars[0] ?? null : s.cars,
  }));

  return (
    <>
      <PageHeader
        title="Vehicle Schedules"
        subtitle="Blackout & Maintenance"
        description="Block out vehicle dates for scheduled maintenance, personal use, or repairs."
      />

      <Flash {...flash} />

      <div className="grid gap-8 lg:gap-10 xl:gap-12 lg:grid-cols-12">
        {/* Create Schedule Form */}
        <div className="lg:col-span-5">
          <SectionCard
            title="Add Schedule Blackout"
            icon={PlusCircle}
            className="overflow-hidden shadow-sm"
            bodyClassName="p-6 sm:p-7"
          >
            <form action={saveScheduleAction} className="space-y-5">
              <div>
                <Label
                  htmlFor="car_id"
                  className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  Select Vehicle
                </Label>
                <select
                  id="car_id"
                  name="car_id"
                  required
                  defaultValue={selectedCarId ? String(selectedCarId) : ""}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-[#ffcc00] focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-[#ffcc00]/20"
                >
                  <option value="" disabled>
                    Choose a vehicle...
                  </option>
                  {fleet.rows.map((car) => (
                    <option key={car.id} value={car.id}>
                      {[car.brand, car.model].filter(Boolean).join(" ")} ({car.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label
                    htmlFor="start_date"
                    className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                  >
                    Start Date
                  </Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                    className="h-11 rounded-xl border-border px-4 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="end_date"
                    className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                  >
                    End Date
                  </Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    required
                    className="h-11 rounded-xl border-border px-4 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="reason"
                  className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  Reason
                </Label>
                <select
                  id="reason"
                  name="reason"
                  required
                  defaultValue="Maintenance"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-[#ffcc00] focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-[#ffcc00]/20"
                >
                  <option value="Maintenance">Maintenance</option>
                  <option value="Personal Use">Personal Use</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <Label
                  htmlFor="notes"
                  className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  Notes / Details
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="e.g. 50,000km change oil, brake pad replacement..."
                  className="min-h-[100px] rounded-xl border-border p-3.5 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-[#ffcc00] text-sm font-extrabold text-black shadow-md transition-all hover:bg-[#ffd633] hover:scale-[1.01] active:scale-[0.99]"
              >
                Save Schedule
              </Button>
            </form>
          </SectionCard>
        </div>

        {/* Existing Schedules Table */}
        <div className="lg:col-span-7">
          <SectionCard
            title="Active & Upcoming Schedules"
            icon={CalendarRange}
            className="overflow-hidden shadow-sm"
            bodyClassName="p-6 sm:p-7"
          >
            {/* Filter by car */}
            <form method="get" className="mb-5">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  name="car_id"
                  defaultValue={carFilterParam || "all"}
                  className="h-10 min-w-[200px] flex-1 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors hover:border-[#ffcc00] focus:border-[#ffcc00] focus:outline-none"
                >
                  <option value="all">All Vehicles</option>
                  {fleet.rows.map((car) => (
                    <option key={car.id} value={String(car.id)}>
                      {[car.brand, car.model].filter(Boolean).join(" ")} ({car.plate_number})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[#ffcc00] px-5 text-xs font-extrabold text-black shadow-xs transition hover:bg-[#ffd633]"
                >
                  Filter
                </button>
              </div>
            </form>

            {schedules.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No Schedules Found"
                description="There are no active or upcoming blackout schedules registered."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3.5 text-left font-extrabold">Vehicle</th>
                      <th className="px-4 py-3.5 text-left font-extrabold">Dates</th>
                      <th className="px-4 py-3.5 text-left font-extrabold">Reason</th>
                      <th className="px-4 py-3.5 text-right font-extrabold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => {
                      const carName =
                        [s.cars?.brand, s.cars?.model].filter(Boolean).join(" ") ||
                        "Vehicle";

                      return (
                        <tr
                          key={s.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-muted/40"
                        >
                          <td className="px-4 py-3.5 font-semibold text-foreground">
                            <p className="font-bold">{carName}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {s.cars?.plate_number ?? "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-foreground">
                            <p className="font-semibold text-foreground">
                              {formatDate(s.start_date)} - {formatDate(s.end_date)}
                            </p>
                            {s.notes ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                                {s.notes}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-500 dark:text-amber-400">
                              {s.reason}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <form action={deleteScheduleAction}>
                              <input type="hidden" name="id" value={s.id} />
                              <button
                                type="submit"
                                className="inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95"
                                title="Remove Blackout"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
