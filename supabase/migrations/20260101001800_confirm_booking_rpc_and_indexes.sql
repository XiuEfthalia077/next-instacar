-- ============================================================================
-- Migration: 20260101001800_confirm_booking_rpc_and_indexes.sql
-- Description: Atomic PostgreSQL RPC for single roundtrip booking confirmation
--              and optimized foreign key indexes.
-- ============================================================================

-- 1. Foreign key & status indexes on public.bookings
create index if not exists idx_bookings_user_id on public.bookings (user_id);
create index if not exists idx_bookings_car_id on public.bookings (car_id);
create index if not exists idx_bookings_status on public.bookings (status);

-- 2. Atomic single-roundtrip confirmation transaction
create or replace function public.confirm_booking_transaction(
  p_booking_id bigint,
  p_actor_id bigint
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_booking record;
  v_customer_name text;
  v_customer_email text;
  v_now timestamptz := now();
begin
  -- 1. Fetch and row-lock the booking
  select b.*, u.name as user_name, u.email as user_email
  into v_booking
  from public.bookings b
  left join public.users u on u.id = b.user_id
  where b.id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Booking not found.');
  end if;

  if v_booking.status <> 'Pending' then
    return jsonb_build_object('success', false, 'error', 'Error: Can only Confirm a Pending booking.');
  end if;

  -- 2. Update booking status
  update public.bookings
  set status = 'Confirmed',
      last_action_by = p_actor_id,
      last_action_at = v_now,
      last_action_type = 'Confirmed'
  where id = p_booking_id;

  -- 3. Update vehicle status to Active
  if v_booking.car_id is not null then
    update public.cars
    set status = 'Active'
    where id = v_booking.car_id;
  end if;

  v_customer_name := coalesce(v_booking.user_name, v_booking.guest_name, 'Customer');
  v_customer_email := coalesce(v_booking.user_email, v_booking.gmail, '');

  return jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'car_id', v_booking.car_id,
    'branch_id', v_booking.branch_id,
    'customer_name', v_customer_name,
    'customer_email', v_customer_email
  );
end;
$$;
