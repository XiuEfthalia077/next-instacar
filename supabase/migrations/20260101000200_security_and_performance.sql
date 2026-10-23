-- ===========================================================================
-- InstaCar Migration: Security Hardening & Performance Optimization
-- Applied as recommended by Cloudflare Security Audit & Engineering Best Practices
-- ===========================================================================

-- 1. Row Level Security Hardening on bookings
-- Prevents customers from directly updating sensitive financial or status fields via PostgREST
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
  ) with check (
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
  );

-- 2. Performance Indexes (B-Tree) for Hot Query Paths
create index if not exists idx_bookings_car_dates 
  on public.bookings (car_id, start_date, end_date);

create index if not exists idx_bookings_user_status 
  on public.bookings (user_id, status);

create index if not exists idx_bookings_branch_status 
  on public.bookings (branch_id, status);

create index if not exists idx_cars_branch_status 
  on public.cars (branch_id, status);

create index if not exists idx_cars_user_id 
  on public.cars (user_id);

create index if not exists idx_contact_messages_created 
  on public.contact_messages (created_at desc);

-- 3. Temporal Consistency Constraint
alter table public.bookings 
  drop constraint if exists chk_bookings_dates,
  add constraint chk_bookings_dates check (end_date >= start_date);
