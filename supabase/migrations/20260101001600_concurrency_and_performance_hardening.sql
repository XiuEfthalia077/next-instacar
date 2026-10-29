-- ============================================================================
-- Migration: 20260101001600_concurrency_and_performance_hardening.sql
-- Description: Concurrency row-locking trigger to prevent double-booking race
--              conditions, plus high-scale B-tree composite indexes for 1M+ rows.
-- ============================================================================

-- 1. Double-booking prevention function & trigger with row-level lock
create or replace function public.check_booking_overlap_trigger()
returns trigger as $$
declare
  v_conflict_count integer;
begin
  -- Completed and Cancelled bookings do not hold reservation dates
  if NEW.status in ('Cancelled', 'Completed') then
    return NEW;
  end if;

  -- Row-level exclusive lock on the referenced vehicle
  -- This serializes concurrent booking attempts for the same vehicle across transactions.
  if NEW.car_id is not null then
    perform 1 from public.cars where id = NEW.car_id for update;
  end if;

  -- Check for existing active/confirmed overlapping reservations
  select count(*) into v_conflict_count
  from public.bookings
  where car_id = NEW.car_id
    and id is distinct from NEW.id
    and status not in ('Cancelled', 'Completed')
    and (
      NEW.start_date <= end_date
      and NEW.end_date >= start_date
    );

  if v_conflict_count > 0 then
    raise exception 'Double-booking prevented: Vehicle is already reserved for overlapping dates.'
      using errcode = '23P01'; -- exclusion_violation
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_check_booking_overlap on public.bookings;
create trigger trg_check_booking_overlap
before insert or update of car_id, start_date, end_date, status
on public.bookings
for each row
execute function public.check_booking_overlap_trigger();

-- 2. High-performance composite indexes for scaling to 1,000,000+ bookings
create index if not exists idx_bookings_overlap_lookup
  on public.bookings (car_id, start_date, end_date)
  where status not in ('Cancelled', 'Completed');

create index if not exists idx_bookings_status_dates
  on public.bookings (status, start_date, end_date);

create index if not exists idx_bookings_user_id
  on public.bookings (user_id);

create index if not exists idx_bookings_branch_id
  on public.bookings (branch_id);

create index if not exists idx_bookings_created_at
  on public.bookings (created_at desc);

create index if not exists idx_bookings_booking_type
  on public.bookings (booking_type);

create index if not exists idx_booking_payments_dates
  on public.booking_payments (settled_at, created_at);

create index if not exists idx_booking_payments_booking_id
  on public.booking_payments (booking_id);

create index if not exists idx_cars_branch_status
  on public.cars (branch_id, status);

create index if not exists idx_users_role
  on public.users (role);

create index if not exists idx_users_email
  on public.users (email);
