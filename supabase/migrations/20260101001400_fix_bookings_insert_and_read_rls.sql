-- ============================================================================
-- Migration: 20260101001400_fix_bookings_insert_and_read_rls.sql
-- Description: Fix RLS policies on public.bookings for online customer booking.
--
-- Why:
-- When a user creates a booking and requests returned columns (.select('id')),
-- PostgreSQL evaluates the table's SELECT policy (bookings_read) on the newly
-- inserted row during INSERT ... RETURNING.
-- Previously, bookings_read only permitted admins or evaluated user_can_access_booking(id),
-- which executes a subquery against public.bookings. In PostgreSQL MVCC, an in-flight
-- inserted row is not yet visible to separate subqueries inside functions, causing
-- the SELECT check on RETURNING to return false and raise:
--   "Database Error: new row violates row-level security policy for table 'bookings'"
--
-- Adding direct checks (user_id = public.current_user_id()) directly on the row
-- ensures immediate visibility on INSERT ... RETURNING without subquery failure.
-- ============================================================================

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select using (
    public.current_user_role() = 'admin'
    or user_id = public.current_user_id()
    or public.user_can_access_booking(id)
  );

drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert with check (
    user_id = public.current_user_id()
    or user_id = (select id from public.users where auth_id = auth.uid())
    or public.current_user_role() in ('admin', 'staff')
    or auth.role() = 'service_role'
  );
