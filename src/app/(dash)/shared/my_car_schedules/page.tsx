import {
  CalendarDays,
  CalendarRange,
  Clock,
  ExternalLink,
  FileImage,
  FileText,
  Lock,
  PlusCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { FilterBar } from "@/components/common/filter-bar";
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
import { BUCKETS, signedFileUrl } from "@/lib/storage";

export const instant = false;

function formatDisplayTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const h = parseInt(parts[0] ?? "", 10);
  const m = parts[1] ?? "00";
  if (isNaN(h)) return timeStr;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${m} ${suffix}`;
}

export default async function SharedMyCarSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("admin", "operator");
  const params = await searchParams;
  const flash = readFlash(params);

  const carFilterParam = searchParam(params, "car_id");
  const selectedCarId =
    carFilterParam && carFilterParam !== "all"
      ? Number(carFilterParam)
      : undefined;

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
      id, car_id, start_date, end_date, start_time, end_time, reason, notes, attachment_urls, created_at,
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

  const rawSchedules = ((schedulesData ?? []) as unknown as {
    id: number;
    car_id: number;
    start_date: string;
    end_date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string;
    notes: string | null;
    attachment_urls: string[] | null;
    created_at: string;
    cars:
      | { id: number; brand: string | null; model: string | null; plate_number: string | null; user_id: number | null }
      | { id: number; brand: string | null; model: string | null; plate_number: string | null; user_id: number | null }[]
      | null;
  }[]).map((s) => ({
    ...s,
    cars: Array.isArray(s.cars) ? s.cars[0] ?? null : s.cars,
  }));

  // For operators, resolve signed URLs for private client attachments
  const scheduleAttachments: Record<number, { url: string; name: string }[]> = {};
  if (session.role === "operator") {
    for (const s of rawSchedules) {
      if (s.attachment_urls && Array.isArray(s.attachment_urls) && s.attachment_urls.length > 0) {
        const urls = await Promise.all(
          s.attachment_urls.map(async (path: string) => {
            const url = await signedFileUrl(supabase, BUCKETS.operatorPrivateUploads, path);
            const name = path.split("/").pop() || "Document";
            return { url: url || "", name };
          }),
        );
        scheduleAttachments[s.id] = urls.filter((item) => Boolean(item.url));
      }
    }
  }

  return (
    <>
      <PageHeader
        title={session.role === "operator" ? "Master Calendar & Unit Blocks" : "Vehicle Schedules"}
        subtitle="Blackouts & Private Bookings"
        description={
          session.role === "operator"
            ? "Log private off-platform bookings and blackout dates to keep your calendar accurate and prevent double-bookings."
            : "Monitor vehicle schedule blackouts, maintenance periods, and private bookings."
        }
      />

      <Flash {...flash} />

      <div className="grid gap-10 lg:gap-12 xl:gap-14 lg:grid-cols-12 items-start">
        {/* Create Schedule / Block Form */}
        <div className="lg:col-span-5">
          <SectionCard
            title={session.role === "operator" ? "New Schedule / Private Booking" : "Add Schedule Blackout"}
            icon={PlusCircle}
            className="overflow-hidden shadow-sm"
            bodyClassName="p-6 sm:p-8 lg:p-9"
          >
            <form action={saveScheduleAction} encType="multipart/form-data" className="space-y-5">
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
                  className="h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-[#ffcc00] focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-[#ffcc00]/20"
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

              {/* Start Date & Time */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    className="h-11 w-full rounded-xl border-border/80 bg-background/80 px-3 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="start_time"
                    className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                  >
                    Start Time
                  </Label>
                  <Input
                    id="start_time"
                    name="start_time"
                    type="time"
                    defaultValue="08:00"
                    required
                    className="h-11 w-full rounded-xl border-border/80 bg-background/80 px-3 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    className="h-11 w-full rounded-xl border-border/80 bg-background/80 px-3 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="end_time"
                    className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                  >
                    End Time
                  </Label>
                  <Input
                    id="end_time"
                    name="end_time"
                    type="time"
                    defaultValue="17:00"
                    required
                    className="h-11 w-full rounded-xl border-border/80 bg-background/80 px-3 text-sm font-medium transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="reason"
                  className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  Reason / Schedule Type
                </Label>
                <select
                  id="reason"
                  name="reason"
                  required
                  defaultValue={session.role === "operator" ? "Booking" : "Maintenance"}
                  className="h-11 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-[#ffcc00] focus:border-[#ffcc00] focus:outline-none focus:ring-2 focus:ring-[#ffcc00]/20"
                >
                  <option value="Booking">📅 Booking (Private Client / Off-Platform)</option>
                  <option value="Maintenance">🔧 Maintenance / Service</option>
                  <option value="Personal Use">🚗 Personal Use</option>
                  <option value="Unavailable">⛔ Unavailable / Reserved</option>
                  <option value="Other">📝 Other</option>
                </select>
              </div>

              {/* Private Client Requirement Photos (Operator Only or Shared Upload) */}
              <div>
                <Label
                  htmlFor="photos"
                  className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  <span>Private Client IDs & Contracts (Optional)</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    🔒 Private & Encrypted
                  </span>
                </Label>
                <FileUploadDropzone
                  name="photos"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                  maxSizeMB={5}
                  helperText="JPG, PNG, WEBP, or PDF up to 5MB each (multiple files allowed)"
                />
              </div>

              <div>
                <Label
                  htmlFor="notes"
                  className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground"
                >
                  Notes / Private Client Details
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder={
                    session.role === "operator"
                      ? "e.g. Private Client: Juan Cruz (0917-xxx-xxxx), destination Boracay, paid in full..."
                      : "e.g. 50,000km periodic maintenance, brake pad replacement..."
                  }
                  className="min-h-[100px] w-full rounded-xl border-border/80 bg-background/80 p-3 text-sm font-medium leading-relaxed transition-colors hover:border-[#ffcc00] focus-visible:border-[#ffcc00] focus-visible:ring-[#ffcc00]/20"
                />
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#ffcc00] text-sm font-extrabold text-black shadow-md transition-all hover:bg-[#ffd633] active:scale-[0.99]"
              >
                Save Schedule Block
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
            bodyClassName="p-6 sm:p-8 lg:p-9"
          >
            {/* Filter by car */}
            <FilterBar action="/shared/my_car_schedules" className="mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  name="car_id"
                  defaultValue={carFilterParam || "all"}
                  className="h-11 min-w-[200px] flex-1 rounded-xl border border-border/80 bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-[#ffcc00] focus:border-[#ffcc00] focus:outline-none"
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
                  className="h-11 rounded-xl bg-[#ffcc00] px-6 text-xs font-extrabold text-black shadow-xs transition hover:bg-[#ffd633]"
                >
                  Filter
                </button>
              </div>
            </FilterBar>

            {rawSchedules.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No Schedules Found"
                description="There are no active or upcoming blackout schedules registered."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3.5 text-left font-extrabold">Vehicle</th>
                      <th className="px-5 py-3.5 text-left font-extrabold">Timeframe</th>
                      <th className="px-5 py-3.5 text-left font-extrabold">Reason</th>
                      <th className="px-5 py-3.5 text-right font-extrabold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawSchedules.map((s) => {
                      const carName =
                        [s.cars?.brand, s.cars?.model].filter(Boolean).join(" ") ||
                        "Vehicle";

                      // Strict privacy check:
                      // If admin is viewing an operator's schedule/booking, mask private client notes and files.
                      const isOperatorCar = Boolean(
                        s.cars?.user_id && s.cars.user_id !== session.userId,
                      );
                      const isPrivateSchedule =
                        s.reason === "Booking" || isOperatorCar;
                      const maskForAdmin =
                        session.role === "admin" && isPrivateSchedule;

                      const startTimeFormatted = formatDisplayTime(s.start_time);
                      const endTimeFormatted = formatDisplayTime(s.end_time);

                      const attachments = scheduleAttachments[s.id] ?? [];

                      return (
                        <tr
                          key={s.id}
                          className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/40"
                        >
                          <td className="px-5 py-4 font-semibold text-foreground">
                            <p className="font-bold">{carName}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {s.cars?.plate_number ?? "—"}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-xs text-foreground">
                            <p className="font-semibold text-foreground">
                              {formatDate(s.start_date)}
                              {startTimeFormatted ? ` (${startTimeFormatted})` : ""} -{" "}
                              {formatDate(s.end_date)}
                              {endTimeFormatted ? ` (${endTimeFormatted})` : ""}
                            </p>

                            {maskForAdmin ? (
                              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground italic">
                                <Lock className="size-3 text-muted-foreground" />
                                Hidden due to privacy — Private operator booking details and client files are protected.
                              </p>
                            ) : (
                              <>
                                {s.notes ? (
                                  <p className="mt-1 text-[11px] text-muted-foreground italic leading-relaxed">
                                    {s.notes}
                                  </p>
                                ) : null}

                                {attachments.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                      <FileText className="size-3 text-[#ffcc00]" />
                                      Client Files ({attachments.length}):
                                    </span>
                                    {attachments.map((att, idx) => (
                                      <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] transition-colors"
                                      >
                                        <FileImage className="size-3" />
                                        Doc {idx + 1}
                                        <ExternalLink className="size-2.5 opacity-60" />
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                s.reason === "Booking"
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                  : s.reason === "Maintenance"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {s.reason === "Booking" ? "Private Booking" : s.reason}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <form action={deleteScheduleAction}>
                              <input type="hidden" name="id" value={s.id} />
                              <button
                                type="submit"
                                className="inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95"
                                title="Remove Block"
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
