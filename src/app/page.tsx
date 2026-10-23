import type { Metadata } from "next";

import { ContactSection } from "@/components/marketing/contact-section";
import { Features } from "@/components/marketing/features";
import { FleetSection } from "@/components/marketing/fleet-section";
import { Hero } from "@/components/marketing/hero";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { getSiteStats } from "@/lib/public-stats";

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
  const stats = await getSiteStats();

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-display text-white">
      <SiteNavbar />

      <main>
        <Hero />
        <Features />
        <FleetSection cars={stats.popular_cars} />
        <StatsStrip stats={stats} />
        <ContactSection />
      </main>

      <SiteFooter />
    </div>
  );
}
