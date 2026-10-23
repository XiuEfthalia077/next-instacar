import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { requireSession } from "@/lib/auth";
import { calendarBookings } from "@/lib/data/bookings";
import { formatDate, formatTime, manilaToday } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";

export const instant = false;

export default async function SharedCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireSession();
  const params = await searchParams;
  const flash = readFlash(params);

  const todayStr = manilaToday();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const yearParam = searchParam(params, "year");
  const monthParam = searchParam(params, "month");

  const year = yearParam ? Number(yearParam) : currentYear;
  const month = monthParam ? Number(monthParam) : currentMonth;

  // Compute start and end of the requested month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  const bookings = await calendarBookings(session, from, to);

  // Previous and Next month calculations
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const monthName = startDate.toLocaleString("en-US", { month: "long" });

  // Generate days in month
  const daysInMonth = endDate.getDate();
  const firstDayWeekday = startDate.getDay(); // 0 = Sunday

  return (
    <>
      <PageHeader
        title="Fleet Calendar"
        subtitle="Schedule & Availability"
        description={`Interactive booking timeline and vehicle reservations for ${monthName} ${year}.`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/shared/calendar?year=${prevYear}&month=${prevMonth}`}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-[#ffcc00]"
              title="Previous Month"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground">
              {monthName} {year}
            </span>
            <Link
              href={`/shared/calendar?year=${nextYear}&month=${nextMonth}`}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:border-[#ffcc00]"
              title="Next Month"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />

      <Flash {...flash} />

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 border-b border-border pb-2 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 pt-2">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] rounded-lg bg-muted/20 p-1" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;

            // Find bookings that cover this date
            const dayBookings = bookings.filter((b) => {
              if (!b.start_date || !b.end_date) return false;
              return b.start_date <= dateStr && b.end_date >= dateStr;
            });

            return (
              <div
                key={dayNum}
                className={`flex min-h-[110px] flex-col rounded-xl border p-1.5 transition ${
                  isToday
                    ? "border-[#ffcc00] bg-[#ffcc00]/5 ring-1 ring-[#ffcc00]"
                    : "border-border/60 bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between pb-1 text-xs">
                  <span
                    className={`flex size-6 items-center justify-center rounded-full font-bold ${
                      isToday
                        ? "bg-[#ffcc00] text-black"
                        : "text-foreground"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayBookings.length > 0 ? (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {dayBookings.length} trip{dayBookings.length > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                  {dayBookings.slice(0, 3).map((b) => {
                    const carName = [b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") || "Vehicle";

                    return (
                      <Link
                        key={b.id}
                        href={`/shared/booking_details?id=${b.id}`}
                        className="truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold transition hover:bg-[#ffcc00]/20 hover:text-[#b38a00]"
                        title={`#BK-${b.id} - ${carName} (${b.status})`}
                      >
                        <span className="mr-1 font-bold">#BK-{b.id}</span>
                        {carName}
                      </Link>
                    );
                  })}
                  {dayBookings.length > 3 ? (
                    <span className="text-[10px] font-bold text-muted-foreground">
                      +{dayBookings.length - 3} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bookings table for this month */}
      <div className="mt-5">
        <SectionCard title={`All Bookings in ${monthName} ${year}`} icon={CalendarDays}>
          {bookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No Bookings Scheduled"
              description={`There are no bookings scheduled in ${monthName} ${year}.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-left font-bold">Booking</th>
                    <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                    <th className="px-3 py-3 text-left font-bold">Customer</th>
                    <th className="px-3 py-3 text-left font-bold">Rental Window</th>
                    <th className="px-3 py-3 text-center font-bold">Status</th>
                    <th className="px-3 py-3 text-right font-bold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-3 font-semibold text-foreground">
                        #BK-{b.id}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">
                          {[b.cars?.brand, b.cars?.model].filter(Boolean).join(" ") || "Vehicle"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.cars?.plate_number ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground">
                        {b.users?.name || b.guest_name || "Guest"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDate(b.start_date)} ({formatTime(b.pickup_time)}) → {formatDate(b.end_date)} ({formatTime(b.return_time)})
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/shared/booking_details?id=${b.id}`}
                          className="inline-flex items-center rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
