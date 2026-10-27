-- ============================================================================
-- InstaCar — Restore Foreign Key Constraints on public.bookings
-- ============================================================================
-- Fixes missing foreign key relationships on the bookings table:
--   1. bookings_user_id_fkey        -> public.users(id)
--   2. bookings_created_by_fkey     -> public.users(id)
--   3. bookings_last_action_by_fkey -> public.users(id)
-- Also ensures bookings_car_id_fkey and bookings_branch_id_fkey exist.
-- ============================================================================

DO $$
BEGIN
  -- 1. bookings.user_id -> public.users(id)
  -- Uses ON DELETE CASCADE (or ON DELETE SET NULL) for customer profile linking
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_user_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  -- 2. bookings.created_by -> public.users(id)
  -- Uses ON DELETE SET NULL so deleting staff accounts preserves the booking history
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_created_by_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- 3. bookings.last_action_by -> public.users(id)
  -- Uses ON DELETE SET NULL so audit trails remain intact if staff accounts are pruned
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_last_action_by_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_last_action_by_fkey
      FOREIGN KEY (last_action_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  -- 4. bookings.car_id -> public.cars(id)
  -- Uses ON DELETE RESTRICT (or CASCADE) to protect fleet vehicles with active reservations
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_car_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_car_id_fkey
      FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE RESTRICT;
  END IF;

  -- 5. bookings.branch_id -> public.branches(id)
  -- Uses ON DELETE SET NULL
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_branch_id_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_branch_id_fkey
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Reload PostgREST schema cache so join hints (e.g. users!bookings_user_id_fkey) resolve immediately
NOTIFY pgrst, 'reload schema';
