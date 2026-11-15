-- ============================================================================
-- Migration: 20260101002200_fix_cars_schema_and_admin_insert_rls.sql
-- Fix: Admin Add Vehicle Schema Type Mismatch & Explicit RLS Policies
-- ============================================================================

-- 1. FIX COLUMN TYPE MISMATCH
-- price_24_hours was originally created as INTEGER while all other price columns
-- are NUMERIC(10,2). If a user enters decimal prices (e.g. 2500.50), PostgreSQL
-- rejects the insert with code 22P02 (invalid input syntax for type integer).
ALTER TABLE public.cars
  ALTER COLUMN price_24_hours TYPE numeric(10,2) USING price_24_hours::numeric(10,2);

-- Ensure default is 0.00 if null
ALTER TABLE public.cars
  ALTER COLUMN price_24_hours SET DEFAULT 0.00;

-- 2. EXPLICIT RLS POLICIES FOR CARS
-- Drop previous combined policy to eliminate any ambiguity during INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "cars_write" ON public.cars;
DROP POLICY IF EXISTS "cars_insert" ON public.cars;
DROP POLICY IF EXISTS "cars_update" ON public.cars;
DROP POLICY IF EXISTS "cars_delete" ON public.cars;
DROP POLICY IF EXISTS "cars_insert_admin" ON public.cars;
DROP POLICY IF EXISTS "cars_update_admin" ON public.cars;
DROP POLICY IF EXISTS "cars_delete_admin" ON public.cars;

-- Explicit INSERT policy:
-- Allows Admins to insert ANY car (including company-owned where user_id IS NULL)
-- and Operators to insert their own car (where user_id = current_user_id()).
CREATE POLICY "cars_insert" ON public.cars
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.is_operator() AND (user_id = public.current_user_id() OR user_id IS NULL))
  );

-- Explicit UPDATE policy:
CREATE POLICY "cars_update" ON public.cars
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_operator() AND user_id = public.current_user_id())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.is_operator() AND user_id = public.current_user_id())
  );

-- Explicit DELETE policy:
CREATE POLICY "cars_delete" ON public.cars
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_operator() AND user_id = public.current_user_id())
  );

-- 3. STORAGE POLICIES FOR car-images BUCKET
-- Ensure public read and authenticated write/update/delete for admins & operators
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public read car-images" ON storage.objects;
CREATE POLICY "public read car-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'car-images');

DROP POLICY IF EXISTS "car-images write" ON storage.objects;
CREATE POLICY "car-images write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'car-images'
    AND (public.is_admin() OR public.is_operator())
  );

DROP POLICY IF EXISTS "car-images update" ON storage.objects;
CREATE POLICY "car-images update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'car-images'
    AND (public.is_admin() OR public.is_operator())
  )
  WITH CHECK (
    bucket_id = 'car-images'
    AND (public.is_admin() OR public.is_operator())
  );

DROP POLICY IF EXISTS "car-images delete" ON storage.objects;
CREATE POLICY "car-images delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'car-images'
    AND (public.is_admin() OR public.is_operator())
  );
