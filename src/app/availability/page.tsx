import type { Metadata } from "next";
import { connection } from "next/server";

import { SiteNavbar } from "@/components/marketing/site-navbar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicAvailabilityView } from "@/components/marketing/public-availability-view";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { listBranches, type CarWithOwner } from "@/lib/data/cars";
import { manilaToday } from "@/lib/datetime";
import { getAdminClient } from "@/lib/supabase-admin";
import { getSupabase } from "@/lib/auth";
import type { BlockedRange } from "@/components/common/availability-calendar";

export const metadata: Metadata = {
  title: "Check Car Availability & Fleet Schedule | InstaCar",
  description:
    "Check real-time car rental availability, browse our fleet, and view vehicle calendar schedules before booking.",
};

export const instant = false;

export default async function PublicAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const initialCarParam = params.car || params.car_id;
  const initialCarId = initialCarParam ? Number(initialCarParam) : undefined;

  const todayStr = manilaToday();
  const client = getAdminClient() ?? (await getSupabase());

  // 1. Fetch active fleet and branches
  const [branches, carsRes, bookingsRes, schedulesRes] = await Promise.all([
    listBranches(true),
    client
      .from("cars")
      .select(`
        *,
        branches!cars_branch_id_fkey ( id, name )
      `)
      .in("status", ACTIVE_CAR_STATUSES)
      .order("price_24_hours", { ascending: true }),
    client
      .from("bookings")
      .select("car_id, start_date, end_date, status")
      .in("status", OPEN_BOOKING_STATUSES)
      .gte("end_date", todayStr),
    client
      .from("car_schedules")
      .select("car_id, start_date, end_date, reason")
      .gte("end_date", todayStr),
  ]);

  const cars = (carsRes.data || []) as CarWithOwner[];
  const activeBookings = (bookingsRes.data || []) as Array<{
    car_id: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
  }>;
  const activeSchedules = (schedulesRes.data || []) as Array<{
    car_id: number;
    start_date: string;
    end_date: string;
    reason: string;
  }>;

  // 2. Build blocked date ranges per car
  const blockedRangesByCar: Record<number, BlockedRange[]> = {};

  for (const b of activeBookings) {
    if (!b.start_date || !b.end_date) continue;
    if (!blockedRangesByCar[b.car_id]) {
      blockedRangesByCar[b.car_id] = [];
    }
    blockedRangesByCar[b.car_id].push({
      start: b.start_date,
      end: b.end_date,
      reason: "Booked",
    });
  }

  for (const s of activeSchedules) {
    if (!s.start_date || !s.end_date) continue;
    if (!blockedRangesByCar[s.car_id]) {
      blockedRangesByCar[s.car_id] = [];
    }
    blockedRangesByCar[s.car_id].push({
      start: s.start_date,
      end: s.end_date,
      reason: s.reason || "Maintenance",
    });
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors selection:bg-[#ffcc00] selection:text-black">
      <SiteNavbar />
      <main className="overflow-x-hidden pb-16">
        <PublicAvailabilityView
          cars={cars}
          branches={branches}
          blockedRangesByCar={blockedRangesByCar}
          initialCarId={initialCarId}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
