-- ---------------------------------------------------------------------------
-- Migration: Add image_url to public.reviews & setup review-photos storage
-- ---------------------------------------------------------------------------

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS image_url text;

-- Register review-photos public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

-- Public read access for review photos
DROP POLICY IF EXISTS "public read review-photos" ON storage.objects;
CREATE POLICY "public read review-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

-- Authenticated upload access for review photos
DROP POLICY IF EXISTS "authenticated upload review-photos" ON storage.objects;
CREATE POLICY "authenticated upload review-photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'review-photos'
    AND auth.role() = 'authenticated'
  );
