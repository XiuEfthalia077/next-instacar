-- ============================================================================
-- InstaCar — auto-cancel stale online Pending bookings
-- ----------------------------------------------------------------------------
-- The legacy online-booking list pages ran this UPDATE on every load:
--
--   pages/admin/bookings_online.php
--   pages/staff/bookings.php          (scoped to the staff branch)
--
--   UPDATE bookings
--      SET status = 'Cancelled', total_price = 500
--    WHERE status = 'Pending'
--      AND booking_type = 'online'
--      AND (end_date < today
--           OR (end_date = today AND return_time < now)
--           OR start_date < today)
--
-- Doing it inside a security-definer function keeps the exact behaviour
-- (including the fixed ₱500 cancellation fee) without granting a page direct
-- write access, and lets the server render a clean list in one round-trip.
--
-- `p_branch_id` = NULL means "every branch" (admin with All Branches).
-- ============================================================================

create or replace function public.auto_cancel_stale_bookings(
  p_branch_id bigint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_now   time := (now() at time zone 'Asia/Manila')::time;
begin
  update public.bookings
     set status      = 'Cancelled',
         total_price = 500
   where status       = 'Pending'
     and booking_type = 'online'
     and (p_branch_id is null or branch_id = p_branch_id)
     and (
       end_date < v_today
       or (end_date = v_today and return_time < v_now)
       or start_date < v_today
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.auto_cancel_stale_bookings(bigint) from public;
grant execute on function public.auto_cancel_stale_bookings(bigint)
  to authenticated;
