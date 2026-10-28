import { CalendarDays, ClipboardCheck, ClipboardList, Clock, KeyRound, TriangleAlert, Truck } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Money } from "@/components/common/money";
import { requireRole } from "@/lib/auth";
import { bookingCounters, bookingsNeedingAttention, recentBookings, todaySchedule } from "@/lib/data/bookings";
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel";
import { formatDate, manilaLongToday, manilaToday } from "@/lib/datetime";
import { readFlash } from "@/lib/flash";

/**
 * Staff dashboard — port of `car-rental/pages/staff/dashboard.php`.
 *
 * The welcome banner, the four KPI tiles, today's pickup/return list and the
 * last five bookings are kept in the same order as the legacy page.
 */
export const instant = false;

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  const [counters, schedule, recent, attentionItems] = await Promise.all([
    bookingCounters(session),
    todaySchedule(session, 10),
    recentBookings(session, 5),
    bookingsNeedingAttention(session, 20),
  ]);

  const day = manilaToday();

  return (
    <>
      <PageHeader
        title="Staff Dashboard"
        subtitle="Operations"
        description={`Branch overview for ${manilaLongToday()}.`}
      />

      <Flash {...flash} />

      {/* Welcome banner */}
      <section className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold md:text-2xl">
              Good day, <span className="text-[#ffcc00]">{session.name || "Staff"}</span>! 👋
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75 md:text-base">
              You have <strong className="text-white">{counters.pickupsToday}</strong>{" "}
              pickup{counters.pickupsToday === 1 ? "" : "s"} and{" "}
              <strong className="text-white">{counters.returnsToday}</strong>{" "}
              return{counters.returnsToday === 1 ? "" : "s"} scheduled for today —{" "}
              {manilaLongToday()}.
            </p>
            <Link
              href="/staff/bookings"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-6 py-2.5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#ffd633] hover:shadow-[0_4px_15px_rgba(255,204,0,0.4)]"
            >
              <ClipboardCheck className="size-4" />
              View All Bookings
            </Link>
          </div>
          <ClipboardCheck className="hidden size-32 shrink-0 text-white/15 md:block" />
        </div>
      </section>

      {/* Needs Attention Alert Panel for Overdue Releases / Returns */}
      <NeedsAttentionPanel initialItems={attentionItems} />

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Today's Pickups" value={counters.pickupsToday} hint="Cars going out" icon={Truck} />
        <StatCard label="Today's Returns" value={counters.returnsToday} hint="Cars coming in" icon={CalendarDays} />
        <StatCard label="Pending" value={counters.pending} hint="Awaiting action" icon={TriangleAlert} />
        <StatCard label="Active Rentals" value={counters.activeRentals} hint="On the road" icon={KeyRound} />
      </div>

      {/* Today's schedule */}
      <SectionCard
        title="Today's Schedule"
        icon={Clock}
        className="mb-4"
        actions={
          <span className="rounded-full bg-[#ffcc00]/15 px-3 py-1 text-xs font-bold text-[#b38a00]">
            {schedule.length} item{schedule.length === 1 ? "" : "s"}
          </span>
        }
        bodyClassName="p-3"
      >
        {schedule.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No pickups or returns scheduled for today."
            className="py-10"
          />
        ) : (
          <div className="space-y-2">
            {schedule.map((item) => {
              const start = item.start_date ?? "";
              const end = item.end_date ?? "";
              const isPickup = start === day;
              const isReturn = end === day && !isPickup;
              const customer = item.users?.name ?? item.guest_name ?? "Guest";
              const phone = item.users?.phone ?? item.phone_number;

              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                >
                  <span
                    className={
                      isReturn
                        ? "shrink-0 rounded-md bg-sky-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                        : "shrink-0 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {isPickup ? "Pickup" : isReturn ? "Return" : "Today"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {[item.cars?.brand, item.cars?.model].filter(Boolean).join(" ") || "Vehicle"}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        • {item.cars?.plate_number ?? "—"}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {customer}
                      {phone ? <span className="ml-3">☎ {phone}</span> : null}
                    </p>
                  </div>

                  <StatusBadge status={item.status} />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Recent bookings */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <ClipboardList className="size-4 text-[#b38a00]" />
          Recent Bookings
        </h2>
        <Link href="/staff/bookings" className="text-xs font-semibold text-[#b38a00] hover:underline">
          View All →
        </Link>
      </div>

      <SectionCard bodyClassName="overflow-x-auto">
        {recent.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No bookings yet." className="py-12" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-left font-bold">Vehicle</th>
                <th className="px-4 py-3 text-left font-bold">Customer</th>
                <th className="px-4 py-3 text-left font-bold">Dates</th>
                <th className="px-4 py-3 text-center font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((booking) => (
                <tr key={booking.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {[booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "Vehicle"}
                    </p>
                    <code className="text-xs text-muted-foreground">{booking.cars?.plate_number ?? "—"}</code>
                  </td>
                  <td className="px-4 py-3">
                    {booking.users?.name ?? booking.guest_name ?? "Guest"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    <Money value={booking.total_price} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
