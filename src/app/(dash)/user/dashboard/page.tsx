import {
  CalendarCheck,
  CarFront,
  Clock,
  Compass,
  CreditCard,
  KeyRound,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { requireRole } from "@/lib/auth";
import { customerBookings } from "@/lib/data/bookings";
import { formatDate, formatTime, manilaLongToday } from "@/lib/datetime";
import { readFlash } from "@/lib/flash";

/**
 * User dashboard — port of `car-rental/pages/user/dashboard.php`.
 */
export const instant = false;

export default async function UserDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("user");
  const params = await searchParams;
  const flash = readFlash(params);

  const bookings = await customerBookings(session, session.userId);

  const totalBookings = bookings.length;
  const activeRentals = bookings.filter(
    (b) => b.status === "Confirmed" || b.status === "Released",
  ).length;
  const totalSpent = bookings
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);

  const recent = bookings.slice(0, 5);

  return (
    <>
      <PageHeader
        title="My Dashboard"
        subtitle="Customer Area"
        description={`Welcome to your InstaCar member portal • ${manilaLongToday()}`}
        actions={
          <Link
            href="/user/cars"
            className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#ffd633] hover:shadow-[0_4px_15px_rgba(255,204,0,0.3)]"
          >
            <Compass className="size-4" />
            Find a Car
          </Link>
        }
      />

      <Flash {...flash} />

      {/* Welcome banner */}
      <section className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold md:text-2xl">
              Hello, <span className="text-[#ffcc00]">{session.name || "Member"}</span>! 👋
            </h2>
            <p className="mt-2 text-sm text-white/75 md:text-base">
              Manage your vehicle bookings, check reservations, and book your next drive with ease.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/user/cars"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-5 py-2 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#ffd633]"
              >
                <Compass className="size-4" />
                Browse Available Cars
              </Link>
              <Link
                href="/user/mybookings"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Clock className="size-4" />
                View My Trips
              </Link>
            </div>
          </div>
          <CarFront className="hidden size-28 shrink-0 text-white/10 md:block" />
        </div>
      </section>

      {/* KPI grid */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Bookings"
          value={totalBookings}
          hint="All time"
          icon={CalendarCheck}
        />
        <StatCard
          label="Active Rentals"
          value={activeRentals}
          hint="Currently active"
          icon={KeyRound}
          tone="primary"
        />
        <StatCard
          label="Total Spent"
          value={<Money value={totalSpent} />}
          hint="Completed rentals"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Recent bookings */}
        <div className="lg:col-span-8">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-foreground">Recent Bookings</h2>
            <Link
              href="/user/mybookings"
              className="text-xs font-semibold text-[#b38a00] hover:underline"
            >
              View All ({totalBookings}) →
            </Link>
          </div>

          <SectionCard bodyClassName="overflow-x-auto">
            {recent.length === 0 ? (
              <div className="py-10 text-center">
                <CarFront className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  No bookings found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You haven&apos;t booked any cars yet.
                </p>
                <Link
                  href="/user/cars"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#ffcc00] px-4 py-1.5 text-xs font-bold text-black"
                >
                  Find a Car
                </Link>
              </div>
            ) : (
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-left font-bold">Booking</th>
                    <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                    <th className="px-3 py-3 text-left font-bold">Rental Dates</th>
                    <th className="px-3 py-3 text-left font-bold">Total</th>
                    <th className="px-3 py-3 text-center font-bold">Status</th>
                    <th className="px-3 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-3 font-semibold text-foreground">
                        #BK-{booking.id}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">
                          {[booking.cars?.brand, booking.cars?.model]
                            .filter(Boolean)
                            .join(" ") || "Vehicle"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.cars?.plate_number ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs text-foreground">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(booking.pickup_time)}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-bold text-foreground">
                        <Money value={booking.total_price} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href="/user/mybookings"
                          className="inline-flex items-center rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                        >
                          View Trip
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        {/* Info & quick guide */}
        <div className="lg:col-span-4">
          <h2 className="mb-2 px-1 text-base font-bold text-foreground">Rental Guide</h2>

          <SectionCard bodyClassName="space-y-4 p-5">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Compass className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">1. Choose a Vehicle</p>
                <p className="text-xs text-muted-foreground">
                  Browse our available fleet and pick your pickup and return schedule.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <CreditCard className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">2. Provide ID & Proof</p>
                <p className="text-xs text-muted-foreground">
                  Upload primary/secondary IDs and payment receipt to confirm reservation.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">3. Drive Safe</p>
                <p className="text-xs text-muted-foreground">
                  Receive vehicle keys from our branch staff and enjoy a smooth rental!
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
