-- ===========================================================================
-- Migration: 20260101002200_operator_permissions_and_rls.sql
-- Description: Unlocks operator bookings management, backfills terms acceptance,
--              and grants RLS permissions for operators to manage bookings and
--              read payments on vehicles they own.
-- ===========================================================================

-- 1. Backfill terms compliance for all operators so they bypass the terms gate
update public.users
set terms_accepted_at = coalesce(terms_accepted_at, now()),
    terms_version = coalesce(terms_version, 'v1.0')
where role = 'operator';

-- 2. Allow operators to update bookings for cars they own
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update using (
    public.is_admin()
    or (
      public.is_staff()
      and (
        (branch_id is not null and branch_id = public.current_user_branch_id())
        or exists (
          select 1 from public.cars c
          where c.id = bookings.car_id
            and c.branch_id = public.current_user_branch_id()
        )
      )
    )
    or (
      public.current_user_role() = 'operator'
      and (
        created_by = public.current_user_id()
        or exists (
          select 1 from public.cars c
          where c.id = bookings.car_id
            and c.user_id = public.current_user_id()
        )
      )
    )
  )
  with check (
    public.is_admin()
    or (
      public.is_staff()
      and (
        (branch_id is not null and branch_id = public.current_user_branch_id())
        or exists (
          select 1 from public.cars c
          where c.id = bookings.car_id
            and c.branch_id = public.current_user_branch_id()
        )
      )
    )
    or (
      public.current_user_role() = 'operator'
      and (
        created_by = public.current_user_id()
        or exists (
          select 1 from public.cars c
          where c.id = bookings.car_id
            and c.user_id = public.current_user_id()
        )
      )
    )
  );

-- 3. Allow operators to read booking payments and revenue for their vehicles
drop policy if exists booking_payments_read on public.booking_payments;
create policy booking_payments_read on public.booking_payments
  for select using (
    public.current_user_role() in ('admin', 'staff')
    or exists (
      select 1 from public.bookings b
      where b.id = booking_payments.booking_id
        and b.user_id = public.current_user_id()
    )
    or (
      public.current_user_role() = 'operator'
      and exists (
        select 1 from public.bookings b
        join public.cars c on c.id = b.car_id
        where b.id = booking_payments.booking_id
          and c.user_id = public.current_user_id()
      )
    )
  );
