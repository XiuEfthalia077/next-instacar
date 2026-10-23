-- ============================================================================
-- InstaCar — `ON UPDATE current_timestamp()` triggers
-- ----------------------------------------------------------------------------
-- The legacy MySQL dump declares four timestamp columns with
-- `ON UPDATE current_timestamp()`. Postgres has no column level equivalent, so
-- a trigger keeps the exact same behaviour:
--
--   car_schedules.updated_at
--   reviews.updated_at
--   site_content.updated_at
--   users.created_at          (the legacy dump puts the clause on created_at)
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_car_schedules_updated_at on public.car_schedules;
create trigger trg_car_schedules_updated_at
  before update on public.car_schedules
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_site_content_updated_at on public.site_content;
create trigger trg_site_content_updated_at
  before update on public.site_content
  for each row execute function public.touch_updated_at();

-- The legacy `users` table carries the `ON UPDATE` clause on `created_at`.
create or replace function public.touch_users_created_at()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists trg_users_created_at on public.users;
create trigger trg_users_created_at
  before update on public.users
  for each row execute function public.touch_users_created_at();
