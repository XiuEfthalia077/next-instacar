-- ============================================================================
-- InstaCar — Customer directory access
-- ----------------------------------------------------------------------------
-- The legacy PHP pages joined `users` inline while listing bookings:
--
--   pages/staff/customers.php   -> every customer (role = 'user') with the
--                                   booking counters of that customer
--   pages/staff/bookings.php     -> the customer name of every booking whose
--                                   car belongs to the staff branch
--   pages/operator/bookings.php  -> the customer name of every booking made
--                                   for a car owned by the operator
--
-- The first `users` policy only allowed a row to be read by its owner or by
-- an admin, which made those pages impossible to reproduce. This migration
-- widens the read policy to exactly the rows the legacy pages exposed.
-- ============================================================================

drop policy if exists users_select_self on public.users;

create policy users_select_self on public.users
  for select using (
    auth_id = auth.uid()
    or public.is_admin()
    -- Staff may list every customer of the platform (legacy staff/customers.php)
    or (public.current_user_role() = 'staff' and public.users.role = 'user')
    -- Staff may read the customer behind a booking of their own branch
    or (
      public.current_user_role() = 'staff'
      and exists (
        select 1
        from public.bookings b
        join public.cars c on c.id = b.car_id
        where b.user_id = public.users.id
          and c.branch_id = public.current_user_branch_id()
      )
    )
    -- Operators may read the customer behind a booking of their own cars
    or (
      public.current_user_role() = 'operator'
      and exists (
        select 1
        from public.bookings b
        join public.cars c on c.id = b.car_id
        where b.user_id = public.users.id
          and c.user_id = public.current_user_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- customer_directory()
--
-- Port of the aggregate query of pages/staff/customers.php:
--
--   SELECT u.id, u.name, u.email, u.phone, u.created_at,
--          COUNT(b.id)                                             total_bookings,
--          SUM(b.status = 'Completed')                             completed_bookings,
--          SUM(b.status = 'Cancelled')                              cancelled_bookings,
--          SUM(b.status IN ('Confirmed','Active','Pending'))        active_bookings,
--          (SELECT br.name FROM bookings b2
--             LEFT JOIN branches br ON b2.branch_id = br.id
--            WHERE b2.user_id = u.id ORDER BY b2.id DESC LIMIT 1)    last_branch_name
--   FROM users u LEFT JOIN bookings b ON b.user_id = u.id
--   WHERE u.role = 'user'
--   GROUP BY u.id
--   ORDER BY u.created_at DESC
--
-- NOTE: the legacy query listed 'Active' as a booking status, but the real
-- `booking_status` enum only contains
-- ('Pending','Confirmed','Released','Completed','Cancelled') - in MySQL the
-- unknown value never matched. 'Released' is the status that actually means
-- "the car is currently with the customer", so it is used here.
--
-- Security definer because the aggregate needs to read `bookings` rows that
-- a staff member is not allowed to see individually.
-- ---------------------------------------------------------------------------
create or replace function public.customer_directory()
returns table (
  id                  bigint,
  name                text,
  email               text,
  phone               text,
  created_at          timestamptz,
  total_bookings      bigint,
  completed_bookings  bigint,
  cancelled_bookings  bigint,
  active_bookings     bigint,
  last_branch_name    text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.name,
    u.email,
    u.phone,
    u.created_at,
    count(b.id) as total_bookings,
    count(*) filter (where b.status = 'Completed') as completed_bookings,
    count(*) filter (where b.status = 'Cancelled') as cancelled_bookings,
    count(*) filter (where b.status in ('Confirmed', 'Released', 'Pending')) as active_bookings,
    (
      select br.name
      from public.bookings b2
      left join public.branches br on b2.branch_id = br.id
      where b2.user_id = u.id
      order by b2.id desc
      limit 1
    ) as last_branch_name
  from public.users u
  left join public.bookings b on b.user_id = u.id
  where u.role = 'user'
  group by u.id
  order by u.created_at desc;
$$;

revoke all on function public.customer_directory() from public, anon;
grant execute on function public.customer_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- booking_contact(p_booking_id)
--
-- Returns the name, e-mail and phone of the customer behind a booking.
-- The legacy booking tables joined `users` inline; the helper keeps the same
-- information available for callers that may not read the `users` row.
-- ---------------------------------------------------------------------------
create or replace function public.booking_contact(p_booking_id bigint)
returns table (
  id            bigint,
  name          text,
  email         text,
  phone         text,
  guest_name    text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    coalesce(u.name, b.guest_name) as name,
    coalesce(u.email, b.gmail) as email,
    coalesce(u.phone, b.phone_number) as phone,
    b.guest_name
  from public.bookings b
  left join public.users u on u.id = b.user_id
  where b.id = p_booking_id;
$$;

revoke all on function public.booking_contact(bigint) from public, anon;
grant execute on function public.booking_contact(bigint) to authenticated;
