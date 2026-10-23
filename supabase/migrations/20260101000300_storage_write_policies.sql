-- ============================================================================
-- InstaCar — Storage write / delete policies
-- ----------------------------------------------------------------------------
-- 20260101000100_rls_and_storage.sql created the buckets and the read
-- policies. The legacy PHP app also *wrote* and *deleted* files:
--
--   cars       car_actions.php      admin + operator upload / replace photos
--   customers  update_customer_info.php  staff + customer upload photos
--   ids        booking_process.php   customer uploads the mandatory primary ID
--   remittance record_remittance.php    staff/admin upload payment proofs
--   qr code    profile_actions.php  payment QR code (images/qr_code_payment.png)
--
-- The legacy uploader stored every file under
-- car-rental/public/assets/images/<folder>/ and the database kept the plain
-- file name (or `<folder>/<file>` for the customer uploads). The bucket keys
-- therefore stay identical to the legacy paths.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- car-images: admins and operators manage the fleet photos
-- ---------------------------------------------------------------------------
drop policy if exists "car-images write" on storage.objects;
create policy "car-images write" on storage.objects
  for insert with check (
    bucket_id = 'car-images'
    and public.current_user_role() in ('admin', 'operator')
  );

drop policy if exists "car-images update" on storage.objects;
create policy "car-images update" on storage.objects
  for update using (
    bucket_id = 'car-images'
    and public.current_user_role() in ('admin', 'operator')
  )
  with check (
    bucket_id = 'car-images'
    and public.current_user_role() in ('admin', 'operator')
  );

drop policy if exists "car-images delete" on storage.objects;
create policy "car-images delete" on storage.objects
  for delete using (
    bucket_id = 'car-images'
    and public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- site-assets: the payment QR code and the favicons
-- ---------------------------------------------------------------------------
drop policy if exists "site-assets write" on storage.objects;
create policy "site-assets write" on storage.objects
  for insert with check (
    bucket_id = 'site-assets'
    and public.current_user_role() in ('admin', 'operator')
  );

drop policy if exists "site-assets update" on storage.objects;
create policy "site-assets update" on storage.objects
  for update using (
    bucket_id = 'site-assets'
    and public.current_user_role() in ('admin', 'operator')
  )
  with check (
    bucket_id = 'site-assets'
    and public.current_user_role() in ('admin', 'operator')
  );

-- ---------------------------------------------------------------------------
-- booking-uploads: the customer ID / proof files
-- ---------------------------------------------------------------------------
drop policy if exists "booking-uploads write" on storage.objects;
create policy "booking-uploads write" on storage.objects
  for insert with check (
    bucket_id = 'booking-uploads'
    and auth.role() = 'authenticated'
  );

drop policy if exists "booking-uploads delete" on storage.objects;
create policy "booking-uploads delete" on storage.objects
  for delete using (
    bucket_id = 'booking-uploads'
    and public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- booking-photos: customer photos attached to a booking
-- ---------------------------------------------------------------------------
drop policy if exists "booking-photos write" on storage.objects;
create policy "booking-photos write" on storage.objects
  for insert with check (
    bucket_id = 'booking-photos'
    and auth.role() = 'authenticated'
  );

-- delete_customer_item.php removed the physical file when a customer photo
-- was deleted, but only for users allowed to access the booking.
drop policy if exists "booking-photos delete" on storage.objects;
create policy "booking-photos delete" on storage.objects
  for delete using (
    bucket_id = 'booking-photos'
    and exists (
      select 1
      from public.booking_photos bp
      join public.bookings b on b.id = bp.booking_id
      where bp.file_name = storage.objects.name
        and public.user_can_access_booking(b.id)
    )
  );

-- ---------------------------------------------------------------------------
-- remittance-photos: operator / staff payment proofs
-- ---------------------------------------------------------------------------
drop policy if exists "remittance-photos write" on storage.objects;
create policy "remittance-photos write" on storage.objects
  for insert with check (
    bucket_id = 'remittance-photos'
    and public.current_user_role() in ('admin', 'staff')
  );

drop policy if exists "remittance-photos delete" on storage.objects;
create policy "remittance-photos delete" on storage.objects
  for delete using (
    bucket_id = 'remittance-photos'
    and public.current_user_role() in ('admin', 'staff')
  );
