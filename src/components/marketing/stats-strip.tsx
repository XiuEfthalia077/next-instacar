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
    <section className="py-4">
      <div className="mx-auto w-full max-w-[1320px] px-3">
        <div className="grid items-center rounded-[2rem] border border-[#6c757d]/25 bg-black/50 p-5 md:grid-cols-3 md:p-12">
          <div className="mb-3 text-center md:mb-0">
            <h3 className="text-[calc(1.475rem+2.7vw)] font-bold leading-tight text-[#ffcc00] xl:text-[3.5rem]">
              {formatCount(satisfiedRenters)}+
            </h3>
            <p className="mb-0 text-[#6c757d]">Satisfied Renters</p>
          </div>
          <div className="mb-3 text-center md:mb-0">
            <h3 className="text-[calc(1.475rem+2.7vw)] font-bold leading-tight text-white xl:text-[3.5rem]">
              {rating.toFixed(1)} ★
            </h3>
            <p className="mb-0 text-[#6c757d]">
              {formatCount(stats.total_reviews)} Reviews
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-[calc(1.475rem+2.7vw)] font-bold leading-tight text-[#ffcc00] xl:text-[3.5rem]">
              {formatCount(stats.total_cars)}
            </h3>
            <p className="mb-0 text-[#6c757d]">Available Vehicles</p>
          </div>
        </div>
      </div>
    </section>
  );
}
