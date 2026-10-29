-- ============================================================================
-- Migration: 20260101001500_allow_staff_bookings_read_and_past_dates.sql
-- Description: Allow staff and admin full read/write visibility for bookings
--              so INSERT ... RETURNING and past-date booking modifications succeed.
-- ============================================================================

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings
  for select using (
    public.current_user_role() in ('admin', 'staff')
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
