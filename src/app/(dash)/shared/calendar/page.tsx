import { connection } from "next/server";

import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { CalendarView } from "@/components/shared/calendar-view";
import { requireSession } from "@/lib/auth";
import { calendarBookings } from "@/lib/data/bookings";
import { manilaToday } from "@/lib/datetime";
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

  const daysInMonth = endDate.getDate();
  const firstDayWeekday = startDate.getDay(); // 0 = Sunday

  const isAdminOrStaff = session.role === "admin" || session.role === "staff";

  return (
    <>
      <PageHeader
        title="Fleet Calendar & Scheduling"
        subtitle="Schedule & Availability"
        description={`Interactive booking timeline and vehicle reservations for ${monthName} ${year}.`}
      />

      <Flash {...flash} />

      <CalendarView
        year={year}
        month={month}
        monthName={monthName}
        prevYear={prevYear}
        prevMonth={prevMonth}
        nextYear={nextYear}
        nextMonth={nextMonth}
        todayStr={todayStr}
        daysInMonth={daysInMonth}
        firstDayWeekday={firstDayWeekday}
        bookings={bookings}
        isAdminOrStaff={isAdminOrStaff}
      />
    </>
  );
}
