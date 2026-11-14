import type { Metadata } from "next";

import { ContactSection } from "@/components/marketing/contact-section";
import { Features } from "@/components/marketing/features";
import { FleetSection } from "@/components/marketing/fleet-section";
import { Hero } from "@/components/marketing/hero";
import { ReviewsSection, type ReviewItem } from "@/components/marketing/reviews-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { getSiteStats } from "@/lib/public-stats";
import { getSupabase } from "@/lib/auth";

export const metadata: Metadata = {
  title: "InstaCar | Reliable Local Car Rentals — Simple, Fast, Transparent",
  description:
    "Book a car online with InstaCar. Clear daily rates, inspected vehicles and straightforward handoffs.",
};

/**
 * Public landing page — port of `car-rental/index.php`.
 *
 * The legacy page was a single PHP file that queried the database directly.
 * The same numbers are now produced by the `public_site_stats()` RPC, so the
 * page renders without any privileged server access.
 */
export default async function HomePage() {
  const [stats, supabase] = await Promise.all([
    getSiteStats(),
    getSupabase(),
  ]);

  let initialReviews: ReviewItem[] = [];
  try {
    const { data } = await supabase
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
        <Hero />
        <Features />
        <FleetSection cars={stats.popular_cars} />
        <StatsStrip stats={stats} />
        <ReviewsSection initialReviews={initialReviews} />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}
