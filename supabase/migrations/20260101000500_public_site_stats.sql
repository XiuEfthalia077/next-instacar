-- ============================================================================
-- InstaCar — public site statistics
-- ----------------------------------------------------------------------------
-- The legacy `car-rental/index.php` renders four numbers on the landing page
-- (satisfied renters, average rating, review count, available vehicles) plus a
-- "most booked" fleet carousel.
--
-- Those aggregates cross RLS protected tables (`bookings`, `users`, `reviews`),
-- so they are exposed through a single `security definer` function instead of
-- granting anonymous access to the tables themselves.
-- ============================================================================

create or replace function public.public_site_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    -- `SELECT COUNT(id) FROM bookings WHERE status IN ('Confirmed','Completed')`
    'confirmed_bookings', (
      select count(*) from public.bookings
       where status in ('Confirmed', 'Completed')
    ),
    -- fallback of the legacy page: `SELECT COUNT(id) FROM users`
    'total_users', (
      select count(*) from public.users
    ),
    -- `SELECT AVG(rating), COUNT(*) FROM reviews`
    'avg_rating', coalesce((
      select avg(rating) from public.reviews
    ), 5.0),
    'total_reviews', (
      select count(*) from public.reviews
    ),
    -- `SELECT COUNT(*) FROM cars`
    'total_cars', (
      select count(*) from public.cars
    ),
    -- the "popular rides" carousel
    'popular_cars', coalesce((
      select jsonb_agg(row_to_json(p))
        from (
          select c.id,
                 c.brand,
                 c.model,
                 c.type,
                 c.fuel_type,
                 c.transmission,
                 c.capacity,
                 c.image_path,
                 c.price_24_hours,
                 c.price_12_hours,
                 c.price_10_hours,
                 c.plate_number,
                 c.status,
                 count(b.id) as total_bookings
            from public.cars c
            left join public.bookings b on c.id = b.car_id
           group by c.id
           order by count(b.id) desc, c.id asc
           limit 6
        ) p
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.public_site_stats()
  to anon, authenticated;
