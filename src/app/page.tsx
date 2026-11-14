import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { ContactSection } from "@/components/marketing/contact-section";
import { Features } from "@/components/marketing/features";
import { FeaturedCarsCarousel } from "@/components/marketing/featured-cars-carousel";
import { Hero } from "@/components/marketing/hero";
import { LandingAvailabilitySection } from "@/components/marketing/landing-availability-section";
import { ReviewsSection, type ReviewItem } from "@/components/marketing/reviews-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { getSiteStats } from "@/lib/public-stats";
import { getSupabase, getSession } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { listBranches, type CarWithOwner } from "@/lib/data/cars";
import { ACTIVE_CAR_STATUSES, OPEN_BOOKING_STATUSES } from "@/lib/data/legacy-status";
import { manilaToday } from "@/lib/datetime";
import type { BlockedRange } from "@/components/common/availability-calendar";

export const metadata: Metadata = {
  title: "InstaCar | Reliable Local Car Rentals — Simple, Fast, Transparent",
  description:
    "Book a car online with InstaCar. Clear daily rates, inspected vehicles, and straightforward handoffs across Iloilo and Panay.",
};

export default async function HomePage() {
  await connection();
  const todayStr = manilaToday();
  const client = getAdminClient() ?? (await getSupabase());

  const [stats, branches, carsRes, bookingsRes, schedulesRes, session] = await Promise.all([
    getSiteStats(),
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
    getSession().catch(() => null),
  ]);

  const isLoggedIn = !!session?.userId;

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

  // Build blocked date ranges per car for the interactive calendar
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

  // Fetch approved customer reviews
  let initialReviews: ReviewItem[] = [];
  try {
    const { data } = await client
      .from("reviews")
      .select(`
        id,
        rating,
        review_title,
        review_text,
        image_url,
        created_at,
        users!reviews_user_id_fkey ( name ),
        bookings!reviews_booking_id_fkey (
          cars!bookings_car_id_fkey ( brand, model )
        )
      `)
      .in("status", ["approved", "replied"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      initialReviews = (data as unknown as Array<{
        id: number;
        rating: number | null;
        review_title: string | null;
        review_text: string | null;
        image_url: string | null;
        created_at: string | null;
        users: { name: string | null } | null;
        bookings: {
          cars: { brand: string | null; model: string | null } | null;
        } | null;
      }>).map((r) => {
        const carName =
          [r.bookings?.cars?.brand, r.bookings?.cars?.model].filter(Boolean).join(" ") ||
          "Rental Vehicle";
        const dateStr = r.created_at
          ? new Date(r.created_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })
          : "Recent Trip";

        return {
          id: r.id,
          authorName: r.users?.name || "Verified Customer",
          rating: r.rating || 5,
          date: dateStr,
          carName,
          title: r.review_title || "Verified Rental Experience",
          text: r.review_text || "",
          verified: true,
          photoUrl: r.image_url,
        };
      });
    }
  } catch {
    initialReviews = [];
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground transition-colors selection:bg-[#ffcc00] selection:text-black">
      <SiteNavbar />

      <main className="overflow-x-hidden pb-24 md:pb-0">
        {/* Task 1.1 & 1.2: Top Hero & KAYAK Search Widget with Mini-Map Modal */}
        <Hero branches={branches} todayStr={todayStr} />

        {/* Task 1.4: Featured Cars Carousel (Continuous marquee, pauses on hover, car detail modal) */}
        <FeaturedCarsCarousel cars={stats.popular_cars} reviews={initialReviews} />

        {/* Task 1.4: Search Data Integration & Availability Section (2-Column: Left 4 scrollable cars, Right interactive calendar) */}
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-muted/20" />}>
          <LandingAvailabilitySection
            cars={cars}
            branches={branches}
            blockedRangesByCar={blockedRangesByCar}
            isLoggedIn={isLoggedIn}
          />
        </Suspense>

        {/* Features Showcase */}
        <Features />

        {/* Verified Customer Reviews */}
        <ReviewsSection initialReviews={initialReviews} />

        {/* Direct Contact & Inquiries */}
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}
