import type { SiteStats } from "@/lib/public-stats";

function formatCount(value: number) {
  return Number(value ?? 0).toLocaleString("en-PH");
}

/**
 * "Live Platform Statistics" — port of the statistics strip of
 * `car-rental/index.php`.
 *
 * Legacy queries:
 *   - `SELECT COUNT(id) FROM bookings WHERE status IN ('Confirmed','Completed')`
 *     and, when that is zero, `SELECT COUNT(id) FROM users`
 *   - `SELECT AVG(rating), COUNT(*) FROM reviews`
 *   - `SELECT COUNT(*) FROM cars`
 */
export function StatsStrip({ stats }: { stats: SiteStats }) {
  // The legacy page falls back to the user count when no booking is confirmed.
  const satisfiedRenters =
    stats.confirmed_bookings > 0 ? stats.confirmed_bookings : stats.total_users;

  const rating = Number(stats.avg_rating ?? 5);

  return (
    <section className="py-8">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        <div className="grid items-center rounded-3xl border border-border bg-card p-6 shadow-sm md:grid-cols-3 md:p-10">
          <div className="mb-4 text-center md:mb-0">
            <h3 className="text-4xl font-black text-amber-600 dark:text-[#ffcc00] lg:text-5xl">
              {formatCount(satisfiedRenters)}+
            </h3>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground">
              Satisfied Drivers Served
            </p>
          </div>
          <div className="mb-4 text-center md:mb-0 border-y md:border-y-0 md:border-x border-border/80 py-4 md:py-0">
            <h3 className="text-4xl font-black text-foreground lg:text-5xl">
              {rating.toFixed(1)} ★
            </h3>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground">
              {formatCount(stats.total_reviews)} Verified Client Reviews
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-4xl font-black text-amber-600 dark:text-[#ffcc00] lg:text-5xl">
              {formatCount(stats.total_cars)}
            </h3>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-muted-foreground">
              Pre-Inspected Fleet Vehicles
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
