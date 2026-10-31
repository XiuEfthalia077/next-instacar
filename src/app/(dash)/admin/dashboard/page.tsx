import {
  CalendarCheck,
  CarFront,
  CircleAlert,
  Globe,
  KeyRound,
  Mail,
  ShieldLock,
  Store,
  TrendingUp,
  Users,
  UserRound,
  Wallet,
  Wrench,
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
import { listBranches, listCars } from "@/lib/data/cars";
import { bookingsNeedingAttention, recentBookings, actionCheckList } from "@/lib/data/bookings";
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel";
import { ActionCheckCard } from "@/components/dashboard/action-check-card";
import { adminDashboardStats } from "@/lib/data/misc";
import { formatDate, formatTime, manilaLongToday, manilaToday } from "@/lib/datetime";
import { readFlash } from "@/lib/flash";

/** Legacy `formatNumberShort()` — 1.2M / 18.4k / 950. */
function shortNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${Math.round((value / 1_000_000_000) * 10) / 10}B`;
  if (abs >= 1_000_000) return `${Math.round((value / 1_000_000) * 10) / 10}M`;
  if (abs >= 1_000) return `${Math.round((value / 1_000) * 10) / 10}k`;
  return value.toLocaleString("en-PH");
}

/**
 * Admin dashboard — port of `car-rental/pages/admin/dashboard.php`.
 *
 * The layout renders `DashboardShell`; this page only renders the content.
 */
export const instant = false;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const [stats, recent, fleet, branches, attentionItems, actionItems] = await Promise.all([
    adminDashboardStats(session),
    recentBookings(session, 5),
    listCars(session, { perPage: 5 }),
    listBranches(),
    bookingsNeedingAttention(session, 20),
    actionCheckList(session, "all", 50),
  ]);

  const day = manilaToday();

  const branchName =
    session.viewBranch === "all"
      ? null
      : branches.find((branch) => branch.id === session.viewBranch)?.name ?? "Branch";

  const recentCars = fleet.rows.slice(0, 5);

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="Main View" />

      <Flash {...flash} />

      {/* Welcome banner */}
      <section className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg md:p-8">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold md:text-2xl">
              Welcome back, <span className="text-[#ffcc00]">{session.name || "Admin"}</span>! 👋
            </h2>
            <p className="mt-2 text-sm text-white/75 md:text-base">
              Platform summary and system control center • {manilaLongToday()}
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#ffcc00]/35 bg-[#ffcc00]/15 px-3 py-1 text-xs font-bold text-[#ffcc00]">
              {branchName === null ? <Globe className="size-3.5" /> : <Store className="size-3.5" />}
              {branchName === null ? "Viewing All Branches" : `Viewing: ${branchName}`}
            </span>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/contact_messages"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ffcc00] px-5 py-2.5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#ffd633] hover:shadow-[0_4px_15px_rgba(255,204,0,0.4)]"
              >
                <Mail className="size-4" />
                View Messages
                {stats.unreadMessages > 0 ? (
                  <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white">
                    {stats.unreadMessages}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/admin/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                <TrendingUp className="size-4 text-[#ffcc00]" />
                Profit Analytics
              </Link>
            </div>
          </div>
          <ShieldLock className="hidden size-32 shrink-0 text-white/15 md:block" />
        </div>
      </section>

      {/* Needs Attention Alert Panel for Overdue Releases / Returns */}
      <NeedsAttentionPanel initialItems={attentionItems} />

      {/* KPI grid */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total Fleet"
          value={stats.totalCars}
          hint={`${stats.availableCars} Available`}
          icon={CarFront}
          tone="info"
        />
        <ActionCheckCard items={actionItems} />
        <StatCard
          label="Monthly Net"
          value={<Money value={stats.monthlyNet} showSign={false} />}
          hint="This month"
          icon={TrendingUp}
          tone="primary"
        />
        <StatCard
          label="Active Trips"
          value={stats.activeBookings}
          hint="Currently Rented"
          icon={KeyRound}
          tone="success"
        />
        <StatCard
          label="Total Revenue"
          value={`₱${shortNumber(stats.totalNet)}`}
          hint="All time"
          icon={Wallet}
          tone="purple"
        />
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          hint={`${stats.completedThisMonth} Completed`}
          icon={CalendarCheck}
          tone="info"
        />
        <StatCard
          label="Customers"
          value={stats.totalCustomers}
          hint="Registered users"
          icon={Users}
          tone="success"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingBookings}
          hint="Awaiting check"
          icon={CircleAlert}
          tone="warning"
        />
        <StatCard
          label="Operators"
          value={stats.totalOperators}
          hint="Active partners"
          icon={UserRound}
          tone="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Recent bookings */}
        <div className="lg:col-span-7">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-foreground">Recent Bookings</h2>
            <Link href="/admin/bookings_online" className="text-xs font-semibold text-[#b38a00] hover:underline">
              View All →
            </Link>
          </div>

          <SectionCard bodyClassName="overflow-x-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No recent bookings found.
              </p>
            ) : (
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-left font-bold">Customer</th>
                    <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                    <th className="px-3 py-3 text-left font-bold">Dates</th>
                    <th className="px-3 py-3 text-left font-bold">Total</th>
                    <th className="px-3 py-3 text-center font-bold">Status</th>
                    <th className="px-3 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((booking) => {
                    const customerName = booking.users?.name ?? booking.guest_name ?? "Guest";
                    const initial = customerName.charAt(0).toUpperCase();
                    const carTitle = [booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "Vehicle";

                    return (
                      <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ffcc00]/15 text-xs font-bold text-[#b38a00] dark:text-[#ffd700]">
                              {initial}
                            </span>
                            <div>
                              <p className="font-bold text-foreground text-xs sm:text-sm">
                                {customerName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">#BK-{booking.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-xs sm:text-sm">
                            {carTitle}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{booking.cars?.plate_number ?? "—"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-medium">
                            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{formatTime(booking.pickup_time)}</p>
                        </td>
                        <td className="px-3 py-3 font-bold text-xs sm:text-sm">
                          <Money value={booking.total_price} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/shared/booking_details?id=${booking.id}`}
                            className="inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        {/* Recent vehicles + priorities */}
        <div className="lg:col-span-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-foreground">Recent Vehicles</h2>
            <Link href="/shared/cars" className="text-xs font-semibold text-[#b38a00] hover:underline">
              View All →
            </Link>
          </div>

          <SectionCard className="mb-4" bodyClassName="overflow-x-auto">
            {recentCars.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No vehicles found.</p>
            ) : (
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3 text-left font-bold">Vehicle</th>
                    <th className="px-3 py-3 text-left font-bold">Plate</th>
                    <th className="px-3 py-3 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCars.map((car) => (
                    <tr key={car.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3 font-semibold">
                        {[car.brand, car.model].filter(Boolean).join(" ") || "Vehicle"}
                      </td>
                      <td className="px-3 py-3">
                        <code className="text-xs text-muted-foreground">{car.plate_number ?? "—"}</code>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={car.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          <h2 className="mb-2 px-1 text-base font-bold text-foreground">System Priority</h2>

          <SectionCard bodyClassName="space-y-5 p-5">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Wrench className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">Pending Bookings</p>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingBookings} booking(s) awaiting confirmation.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <Wallet className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">Revenue Overview</p>
                <p className="text-xs text-muted-foreground">
                  <Money value={stats.monthlyNet} /> earned this month.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CarFront className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">Fleet Status</p>
                <p className="text-xs text-muted-foreground">
                  {stats.availableCars} cars available for rent.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
