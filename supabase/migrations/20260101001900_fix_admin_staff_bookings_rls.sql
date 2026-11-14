-- ============================================================================
-- Migration: 20260101001900_fix_admin_staff_bookings_rls.sql
-- Description: Idempotent RLS policies on public.bookings for Admin/Staff inserts
--              and guest walk-in support with INSERT ... RETURNING.
-- ============================================================================

-- 1. Safely drop existing policies if they already exist
drop policy if exists bookings_read on public.bookings;
drop policy if exists bookings_insert on public.bookings;

-- 2. Create updated bookings_read policy
create policy bookings_read on public.bookings
  for select using (
    public.current_user_role() in ('admin', 'staff')
    or created_by = public.current_user_id()
    or user_id = public.current_user_id()
    or public.user_can_access_booking(id)
  );

-- 3. Create updated bookings_insert policy
create policy bookings_insert on public.bookings
  for insert with check (
    public.current_user_role() in ('admin', 'staff')
    or created_by = public.current_user_id()
    or user_id = public.current_user_id()
    or user_id = (select id from public.users where auth_id = auth.uid())
    or auth.role() = 'service_role'
  );
