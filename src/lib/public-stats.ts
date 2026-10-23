/**
 * Public (anonymous) data access for the marketing site.
 *
 * The legacy `car-rental/index.php` queried the database directly from PHP.
 * Here the same numbers are produced by the `public_site_stats()` RPC, which
 * is granted to the `anon` role, so the landing page never needs the service
 * role key and stays cacheable.
 *
 * See `supabase/migrations/20260101000500_public_site_stats.sql`.
 */

export type PopularCar = {
  id: number;
  brand: string | null;
  model: string | null;
  type: string | null;
  fuel_type: string | null;
  transmission: string | null;
  capacity: number | null;
  image_path: string | null;
  price_24_hours: number | null;
  price_12_hours: number | null;
  price_10_hours: number | null;
  plate_number: string | null;
  status: string | null;
  total_bookings: number;
};

export type SiteStats = {
  confirmed_bookings: number;
  total_users: number;
  avg_rating: number;
  total_reviews: number;
  total_cars: number;
  popular_cars: PopularCar[];
};

const EMPTY_STATS: SiteStats = {
  confirmed_bookings: 0,
  total_users: 0,
  avg_rating: 5,
  total_reviews: 0,
  total_cars: 0,
  popular_cars: [],
};

function publicConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url || !key) return null;

  return { url, key };
}

/**
 * Loads the landing page numbers + the "popular rides" carousel.
 *
 * Mirrors the legacy queries:
 *   - `SELECT COUNT(id) FROM bookings WHERE status IN ('Confirmed','Completed')`
 *     (falls back to `SELECT COUNT(id) FROM users` when there is none)
 *   - `SELECT AVG(rating), COUNT(*) FROM reviews`
 *   - `SELECT COUNT(*) FROM cars`
 *   - the six most booked cars
 */
export async function getSiteStats(): Promise<SiteStats> {
  const config = publicConfig();

  if (!config) return EMPTY_STATS;

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/public_site_stats`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      next: { revalidate: 300 },
    });

    if (!response.ok) return EMPTY_STATS;

    const data = (await response.json()) as Partial<SiteStats>;

    return {
      ...EMPTY_STATS,
      ...data,
      popular_cars: Array.isArray(data.popular_cars) ? data.popular_cars : [],
    };
  } catch {
    return EMPTY_STATS;
  }
}
