-- ============================================================================
-- InstaCar — seed data
-- ----------------------------------------------------------------------------
-- Generated from car-rental/if0_42471936_car_rental.sql by
-- scripts/generate-seed.mjs. Every legacy row is preserved with the same
-- primary keys so all foreign keys (bookings -> cars -> users, and so on)
-- keep pointing at the same records.
--
-- Notes
--   * users.auth_id is NULL for every seeded row. `supabase/backfill-auth.sql`
--     (part of `supabase/apply-all.sql`) creates the matching Supabase Auth
--     account for each row afterwards, so the seeded accounts can sign in
--     with their original legacy passwords.
--   * `public.ensure_user_profile()` links an Auth account to a legacy row
--     only when that row has no password, so an existing account can never be
--     taken over by registering the same e-mail address.
--   * The legacy dump stores three accounts under the same e-mail address
--     (delsocorro.gm@gmail.com). Postgres needs a unique e-mail, so the
--     duplicates are aliased below.
-- ============================================================================

--   users.id 40: 'delsocorro.gm@gmail.com' -> 'delsocorro.gm+40@gmail.com'
--   users.id 46: 'delsocorro.gm@gmail.com' -> 'delsocorro.gm+46@gmail.com'

set client_encoding = 'UTF8';

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------
insert into public."branches" ("id", "name", "address", "phone", "is_active", "created_at") values
  (1, 'Pandac, Pavia, Iloilo (Main Branch)', 'Instacar Car Rental  Services, Pandac, Pavia, Iloilo', '', true, timestamptz '2026-09-15T17:18:26'),
  (2, 'Tabuc suba', 'Tabuc Suba, Baptist Church', '123123', false, timestamptz '2026-09-15T17:18:26')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
insert into public."users" ("id", "google_id", "name", "email", "password", "phone", "role", "branch_id", "created_at", "reset_token", "token_expiry", "verification_token", "is_verified") values
  (7, null, 'Admin', 'admin@gmail.com', '$2y$10$fmIO7SFwZo0Fi.GA89fs9uhMkwnDUjsFYxXxMzVLoI1jJsuxevUdq', '123456789', 'admin', null, timestamptz '2026-08-29T04:12:07', null, null, null, true),
  (8, null, 'Operator', 'operator@gmail.com', '$2y$10$M6LQaV7Z8p6nJ48yULnbueOnyYCLasoGfxjNdTb0oh7QJBhZ0ZRn6', '912345678', 'operator', 1, timestamptz '2026-09-15T17:19:00', null, null, null, true),
  (9, null, 'User', 'user@gmail.com', '$2y$10$H574MWcEDysEmMn9C7tNfuwp1/9rShWBaUOUNkBnZdaaYOIQ3IbMi', '912345678', 'user', 1, timestamptz '2026-09-15T17:19:00', null, null, null, true),
  (36, '103861719423109570218', 'Roy Jhan Atong Hapundar', 'roat.hapundar.ui@phinmaed.com', '$2y$10$kRHFCY.Sn8/x7twqfEA37epyrxaZOAF.B9MN/Wth5elVqabxjRaSO', '', 'user', 1, timestamptz '2026-09-15T17:19:00', null, null, null, true),
  (37, '117078697482733246781', 'Ronamae Sablon', 'rona.sablon.ui@phinmaed.com', '$2y$10$KgsHZOp3ZF.atTQzGFEPqOHbUHntVbka5BVxsJYsHQVb5v3WcSFn6', '', 'user', 1, timestamptz '2026-09-15T17:19:00', null, null, null, true),
  (38, null, 'Grayson Mark Del Socorro', 'instacaradminapp@gmail.com', '$2y$10$xQRb5W.5cCd3gNHZa7Kta.gOgjSa1OXKAeb2kc8BQeoQ905FiE9zC', '09175540394', 'admin', null, timestamptz '2026-09-15T17:31:46', null, null, null, true),
  (39, '102514307064600363666', 'GRAYSON Del Socorro', 'delsocorro.gm@gmail.com', '$2y$10$t6bipS8yxvZP09EiCW7.w.HtZipJMMCJ6GWDR0/WOtMXriFlr2wQi', '', 'user', 1, timestamptz '2026-09-15T17:19:00', null, null, null, true),
  (40, null, 'User Sample 1', 'delsocorro.gm+40@gmail.com', '$2y$10$HLdL0YybyjRo1l2tf/xcv.KyO6dS.vO5LELrZPVlH5PSbYv1W0eO.', '09175540394', 'operator', 1, timestamptz '2026-09-15T17:31:56', null, null, null, true),
  (41, '106271884797849868247', 'Marvin Felicidario Aungon', 'mfaungon.ui@phinmaed.com', '$2y$10$vRPCQRrC1hRED5eOCB2RAuNY.vjqbyATGaKHJ1kBZWc3dFS2HP.g6', '', 'user', 1, timestamptz '2026-09-15T17:19:00', null, null, null, true),
  (42, '110978720349343371210', 'Marvin Aungon(monitoring)', 'marvinaungon98@gmail.com', '$2y$10$F.W.kOQPW5PRZRm1ZVhAxeCxLjmtCWP18IGoxLYFZvQPOlYX50s12', '09093765535', 'admin', null, timestamptz '2026-09-04T22:29:46', null, null, null, true),
  (43, null, 'Staff Cha', 'staff@gmail.com', '$2y$10$9QszK1i/e6LAvqxXXDG4mehcxfD.uCIRR218Y9gCabX21AqsJWsLO', '0123123', 'staff', 1, timestamptz '2026-10-20T16:50:24', null, null, null, true),
  (44, null, 'Staff Rehum', 'staff2@gmail.com', '$2y$10$WLzVMapgHLRKRp1nJ8jlPeW43EtlGc8R9sWBlZnVbHBz3Csb0rBXi', '0123123', 'staff', null, timestamptz '2026-10-20T16:50:14', null, null, null, true),
  (45, '114469332830696398994', 'Mary Grace Cezar CUBOS', 'mace.cubos.ui@phinmaed.com', '$2y$12$mX6k4N/EEZB.z4qMW.EvzeQeiSInycafpyu0AnY8f7ULhVBLqY0Hm', '', 'user', null, timestamptz '2026-10-19T09:42:06', null, null, null, true),
  (46, null, 'Mak', 'delsocorro.gm+46@gmail.com', '$2y$12$JFOjzlgHJKucjsnekXbTlOke0Kr5DDBwXy17dHWApflH4k1RUz8xS', '09175540394', 'staff', 1, timestamptz '2026-10-20T16:58:38', null, null, null, true),
  (47, null, 'Mak', 'delsocorro.grayson@gmail.com', '$2y$12$kVbY6YGHfB6/eAG6sBLn/ea9YorcSN60BeYhvvEuZW7QHkWiSFfLm', '09175540394', 'operator', 1, timestamptz '2026-10-20T17:00:46', null, null, null, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------
insert into public."cars" ("id", "user_id", "branch_id", "brand", "model", "type", "fuel_type", "plate_number", "image_path", "price_24_hours", "status", "transmission", "capacity", "created_at", "operator_24_hours", "ext_price_1_6", "color", "price_10_hours", "operator_10_hours", "price_12_hours", "operator_12_hours", "ext_price_7_10", "ext_price_11_12", "ext_price_13_24") values
  (13, 7, 1, 'Honda', 'City', 'Sedan', 'green', 'XV 013A', 'car_6a967ac4ba12c_1788246724.jpg', 2000, 'Active', 'Automatic', 5, timestamptz '2026-09-01T07:12:04', 0.00, 200.00, 'Red', 1500.00, 0.00, 1700.00, 0.00, 1500.00, 1700.00, 2000.00),
  (14, 7, 1, 'Toyota', 'Wigo', 'Hatchback', 'green', 'FAS 9125', 'car_6a967b467679c_1788246854.jpg', 1500, 'Available', 'Automatic', 5, timestamptz '2026-09-01T07:14:14', 0.00, 200.00, 'Gray', 1099.00, 0.00, 1300.00, 0.00, 1099.00, 1300.00, 1500.00),
  (15, 7, 1, 'Nissan', 'Navara', 'Pickup Truck', 'diesel', 'FAS 9690', 'car_6a967c19c47f1_1788247065.jpg', 3200, 'Available', 'Automatic', 5, timestamptz '2026-09-01T07:17:45', 2500.00, 200.00, 'White', 2500.00, 2000.00, 2700.00, 2300.00, 2500.00, 2700.00, 3200.00),
  (16, 7, 1, 'Honda', 'City', 'Sedan', 'green', 'FAS 6848', 'car_6a967c9c3fd7f_1788247196.jpg', 2000, 'Active', 'Automatic', 5, timestamptz '2026-09-01T07:19:55', 0.00, 200.00, 'White', 1500.00, 0.00, 1700.00, 0.00, 1500.00, 1700.00, 2000.00),
  (17, 7, 1, 'Mitsubishi', 'Xpander', 'MPV / Van', 'green', 'FAR 3295', 'car_6a967d5fdfdd7_1788247391.jpg', 2700, 'Available', 'Automatic', 7, timestamptz '2026-09-01T07:23:11', 0.00, 200.00, 'Silver', 2000.00, 0.00, 2300.00, 0.00, 2000.00, 2300.00, 2700.00),
  (18, 7, 1, 'Mitsubishi', 'Mirage G4', 'Sedan', 'green', 'FAR 6969', 'car_6a967dd01a2d7_1788247504.jpg', 1800, 'Available', 'Automatic', 5, timestamptz '2026-09-01T07:25:03', 0.00, 200.00, 'White', 1300.00, 0.00, 1500.00, 0.00, 1300.00, 1500.00, 1800.00),
  (19, 7, 1, 'Mitsubishi', 'Mirage G4', 'Sedan', 'green', 'FAQ 1685', 'car_6a967f2cdb42c_1788247852.jpg', 1800, 'Available', 'Automatic', 5, timestamptz '2026-09-01T07:30:52', 1300.00, 200.00, 'Red', 1300.00, 1000.00, 1500.00, 1100.00, 1300.00, 1500.00, 1800.00),
  (20, 7, 1, 'Mitsubishi', 'Mirage G4', 'Sedan', 'green', 'FAR 7122', 'car_6a967fbfa658c_1788247999.jpg', 1800, 'Available', 'Automatic', 5, timestamptz '2026-09-01T07:33:19', 0.00, 200.00, 'Gray', 1300.00, 0.00, 1500.00, 0.00, 1300.00, 1500.00, 1800.00),
  (21, 7, 1, 'Honda ', 'Citty', 'Sedan', 'green', 'FAR 6973', 'car_6a96802498b98_1788248100.jpg', 2000, 'Available', 'Automatic', 5, timestamptz '2026-09-01T07:35:00', 0.00, 200.00, 'Gray', 1500.00, 0.00, 1700.00, 0.00, 1500.00, 1700.00, 2000.00),
  (22, 7, 1, 'Nissan', 'Urvan (High Roof)', 'MPV / Van', 'diesel', 'FAQ 9668', 'car_6a9680913ec1b_1788248209.jpg', 3700, 'Available', 'Automatic', 15, timestamptz '2026-09-01T07:36:48', 0.00, 250.00, 'White', 3000.00, 0.00, 3300.00, 0.00, 3000.00, 3300.00, 3700.00),
  (23, 8, 1, 'Toyota', 'Fortuner', 'SUV', 'diesel', 'FAT 5148', 'car_6a96949280648_1788253330.jpg', 3, 'Available', 'Automatic', 7, timestamptz '2026-09-01T09:02:10', 2.00, 200.00, 'White', 2.00, 2.00, 2.00, 2.00, 2.00, 2.00, 3.00)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- car_schedules
-- ---------------------------------------------------------------------------
insert into public."car_schedules" ("id", "car_id", "created_by", "start_date", "end_date", "reason", "notes", "created_at", "updated_at") values
  (1, 21, 7, date '2026-10-23', date '2026-10-24', 'Maintenance', 'changeoil', timestamptz '2026-10-21T07:04:43', timestamptz '2026-10-21T07:04:43')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
insert into public."bookings" ("id", "user_id", "created_by", "last_action_by", "last_action_at", "last_action_type", "branch_id", "guest_name", "phone_number", "gmail", "primary_id_path", "secondary_id_path", "car_id", "start_date", "end_date", "pickup_time", "return_time", "total_price", "status", "booking_type", "fulfillment_type", "delivery_address", "return_delivery_address", "created_at", "discount_price", "down_payment", "extension_price", "extension_hours", "proof_billing_path", "proof_payment_path", "remarks", "delivery_fee", "pickup_fee") values
  (96, null, 7, 7, timestamptz '2026-09-16T11:07:05', 'Confirmed', 1, 'Renz', '09984572928', null, '', '', 17, date '2026-09-22', date '2026-09-24', time '09:00:00', time '19:00:00', 7400.00, 'Confirmed', 'manual', 'Pickup', null, null, timestamptz '2026-09-16T11:07:05', 0.00, 0.00, 0.00, 0, '', null, '', 0.00, 0.00),
  (97, null, 7, 7, timestamptz '2026-09-16T11:07:05', 'Confirmed', 1, 'Jerry', '09454248758', null, '', '', 22, date '2026-09-26', date '2026-09-26', time '09:00:00', time '19:00:00', 3000.00, 'Confirmed', 'manual', 'Pickup', null, null, timestamptz '2026-09-16T11:07:05', 0.00, 0.00, 0.00, 0, '', null, '', 0.00, 0.00),
  (98, null, 7, 7, timestamptz '2026-09-16T11:07:05', 'Confirmed', 1, 'Joen', '09101045472', null, '', '', 13, date '2026-09-21', date '2026-09-22', time '09:00:00', time '15:00:00', 2200.00, 'Confirmed', 'manual', 'Pickup', null, null, timestamptz '2026-09-16T11:07:05', 0.00, 0.00, 0.00, 0, '', null, '', 0.00, 0.00),
  (99, null, 7, 7, timestamptz '2026-09-16T11:07:05', 'Confirmed', 1, 'Eshey', '09297632125', null, '', '', 18, date '2026-10-15', date '2026-10-23', time '09:00:00', time '09:00:00', 15200.00, 'Confirmed', 'manual', 'Delivery', 'CT Area', null, timestamptz '2026-09-16T11:07:05', 0.00, 0.00, 0.00, 0, '', null, 'Delivery and pickup — CT Area', 800.00, 0.00),
  (100, null, 7, 7, timestamptz '2026-09-16T11:07:05', 'Confirmed', 1, 'Sky', '09959197254', null, '', '', 14, date '2026-10-03', date '2026-10-04', time '09:00:00', time '14:00:00', 1700.00, 'Confirmed', 'manual', 'Pickup', null, null, timestamptz '2026-09-16T11:07:05', 0.00, 0.00, 0.00, 0, '', null, '', 0.00, 0.00),
  (107, 36, 7, 7, timestamptz '2026-10-19T03:24:26', 'Completed', null, null, null, null, 'user_36_1792380247/primary_1792380247.png', '', 19, date '2026-10-20', date '2026-10-22', time '11:22:00', time '11:22:00', 3600.00, 'Completed', 'manual', 'Pickup', null, null, timestamptz '2026-10-19T03:24:07', 100.00, 100.00, 0.00, 0, 'user_36_1792380247/proof_1792380247.png', null, 'asdasd', 100.00, 150.00),
  (108, null, 7, 7, timestamptz '2026-10-21T04:34:54', 'Completed', null, 'Mak Samlpe 1', '09175540394', 'delsocorro.grayson@gmail.com', 'Mak_Samlpe_1_1792512458/primary_1792512969.png', 'Mak_Samlpe_1_1792512458/secondary_1792512969.jpg', 23, date '2026-10-21', date '2026-10-22', time '08:00:00', time '08:00:00', 3200.00, 'Completed', 'manual', 'Pickup', null, null, timestamptz '2026-10-20T16:07:37', 0.00, 500.00, 0.00, 0, 'Mak_Samlpe_1_1792512458/proof_1792512969.jpg', null, 'Booking Details', 300.00, 300.00),
  (109, 9, null, 7, timestamptz '2026-10-21T04:15:03', 'Cancelled', 1, null, null, null, 'User_9/primary_1792513645.png', 'User_9/secondary_1792513645.jpg', 23, date '2026-10-23', date '2026-10-31', time '09:00:00', time '09:00:00', 500.00, 'Cancelled', 'online', 'Delivery', 'molo plaza', null, timestamptz '2026-10-20T16:27:24', 0.00, 0.00, 0.00, 0, 'User_9/proof_1792513645.jpg', 'User_9/payment_1792513645.png', null, 0.00, 0.00),
  (110, 9, null, 7, timestamptz '2026-10-21T12:22:55', 'Completed', 1, null, null, null, 'User_9/primary_1792555578.png', 'User_9/secondary_1792555578.jpg', 23, date '2026-11-10', date '2026-11-18', time '09:00:00', time '19:00:00', 28800.00, 'Completed', 'online', 'Pickup', '', null, timestamptz '2026-10-21T04:06:18', 0.00, 500.00, 0.00, 0, 'User_9/proof_1792555578.jpg', 'User_9/payment_1792555578.png', null, 0.00, 0.00),
  (111, 9, null, 7, timestamptz '2026-10-21T04:40:36', 'Completed', 1, null, null, null, 'User_9/primary_1792557024.png', 'User_9/secondary_1792557024.png', 22, date '2026-10-21', date '2026-10-21', time '09:00:00', time '19:00:00', 3000.00, 'Completed', 'online', 'Pickup', null, null, timestamptz '2026-10-21T04:30:25', 0.00, 0.00, 0.00, 0, 'User_9/proof_1792557024.png', 'User_9/payment_1792557024.png', null, 0.00, 0.00),
  (112, 9, null, 7, timestamptz '2026-10-21T05:45:54', 'Cancelled', 1, null, null, null, 'User_9/primary_1792560509.png', 'User_9/secondary_1792560509.png', 20, date '2026-10-21', date '2026-10-21', time '13:27:00', time '23:27:00', 500.00, 'Cancelled', 'online', 'Pickup', '', null, timestamptz '2026-10-21T05:28:30', 0.00, 500.00, 0.00, 0, 'User_9/proof_1792560509.png', 'User_9/payment_1792560509.png', null, 0.00, 0.00),
  (113, 9, null, 7, timestamptz '2026-10-21T06:15:44', 'Completed', 1, null, null, null, 'User_9/primary_1792560609.png', 'User_9/secondary_1792560609.png', 21, date '2026-10-21', date '2026-10-22', time '14:00:00', time '17:00:00', 4000.00, 'Completed', 'online', 'Pickup', '', null, timestamptz '2026-10-21T05:30:10', 0.00, 500.00, 0.00, 0, 'User_9/proof_1792560609.png', 'User_9/payment_1792560609.png', null, 0.00, 0.00)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- booking_payments
-- ---------------------------------------------------------------------------
insert into public."booking_payments" ("id", "booking_id", "daily_rent", "carwash", "extension_fee", "delivery_fee", "jer_delivery_fee", "pickup_fee", "jer_pickup_fee", "staff_fees_cleared_at", "fuel", "driver_fee", "damage_fee", "agent_fee", "others", "total_gross", "discount_amount", "total_net", "settled_by", "settled_at", "operator_share", "created_at", "remitted_amount", "remittance_date", "owner_balance", "remarks") values
  (44, 107, 3600.00, 0.00, 0.00, 100.00, 300.00, 150.00, 0.00, null, 0.00, 0.00, 0.00, 0.00, 0.00, 3850.00, 0.00, 3550.00, 7, timestamptz '2026-10-19T11:34:12', 0.00, timestamptz '2026-10-19T03:34:12', 0.00, null, 0.00, 'asdasd'),
  (45, 108, 3200.00, 200.00, 200.00, 300.00, 200.00, 300.00, 200.00, null, 500.00, 0.00, 3500.00, 300.00, 0.00, 8200.00, 0.00, 7500.00, 7, timestamptz '2026-10-21T12:48:12', 2500.00, timestamptz '2026-10-21T04:48:12', 0.00, null, 0.00, 'Booking Details')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- booking_photos
-- ---------------------------------------------------------------------------
insert into public."booking_photos" ("id", "booking_id", "file_name", "uploaded_at") values
  (6, 108, 'customer_108_1792513156_6ad79484ddd9f.png', timestamptz '2026-10-21T00:19:16'),
  (7, 108, 'customer_108_1792557243_6ad840bb6197a.png', timestamptz '2026-10-21T12:34:04'),
  (8, 108, 'customer_108_1792557243_6ad840bb61fe0.png', timestamptz '2026-10-21T12:34:04'),
  (9, 111, 'customer_111_1792557391_6ad8414f0df2d.png', timestamptz '2026-10-21T12:36:31'),
  (10, 113, 'customer_113_1792562804_6ad85674816b6.png', timestamptz '2026-10-21T14:06:45'),
  (11, 113, 'customer_113_1792562804_6ad8567481d78.png', timestamptz '2026-10-21T14:06:45')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- booking_remarks
-- ---------------------------------------------------------------------------
insert into public."booking_remarks" ("id", "booking_id", "created_by", "remark", "created_at") values
  (6, 108, 7, 'details 2', timestamptz '2026-10-21T00:19:16'),
  (7, 108, 7, 'fully paid.. bal carwash', timestamptz '2026-10-21T12:34:04'),
  (8, 111, 7, 'fully paid', timestamptz '2026-10-21T12:36:31'),
  (9, 113, 7, 'fully paid', timestamptz '2026-10-21T14:06:45')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
insert into public."reviews" ("id", "user_id", "booking_id", "rating", "review_text", "admin_reply", "review_title", "status", "created_at", "updated_at") values
  (9, 9, 111, 5, '5 star', null, '5star', 'pending', timestamptz '2026-10-21T04:38:56', timestamptz '2026-10-21T04:38:56')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------------
insert into public."contact_messages" ("id", "name", "email", "subject", "message", "created_at", "is_read") values
  (3, 'Roy Jhan Atong Hapundar', 'roat.hapundar.ui@phinmaed.com', 'Vehicle Breakdown / Emergency Support', 'Naguba salakyan ko part', timestamptz '2026-08-29T05:38:36', true),
  (4, 'Roy Jhan Atong Hapundar', 'roat.hapundar.ui@phinmaed.com', 'Booking & Reservation Inquiry', 'Booking where?', timestamptz '2026-08-29T05:41:32', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- site_content
-- ---------------------------------------------------------------------------
insert into public."site_content" ("id", "content_key", "content_value", "updated_at", "updated_by") values
  (1, 'rental_agreement_html', '<p>This Car Rental Agreement (the "Agreement") is entered into between:<br>
                    <strong>RENTER:</strong> Hereinafter referred to as RENTER;<br>
                    -and- <strong>OWNER:</strong> Instacar Car Rental Services, hereinafter referred to as INSTACAR;<br>
                    Collectively referred to as the "Parties."</p>

                    <h6 class="fw-bold mt-4 text-primary">I. Vehicle Rental</h6>
                    <p>INSTACAR agrees to rent to RENTER a vehicle identified under the details provided in Annex A.</p>

                    <h6 class="fw-bold mt-3 text-primary">II. Term of Agreement</h6>
                    <p>The term of this Car Rental Agreement runs from the date and hour of vehicle pickup as indicated in Annex A until the return of the vehicle to INSTACAR and completion of all terms of this Agreement. The Parties may shorten or extend the estimated rental term by mutual consent.</p>

                    <h6 class="fw-bold mt-3 text-primary">III. Compliance with Terms and Conditions</h6>
                    <p>RENTER complies and agrees with the terms and conditions as stated below.</p>

                    <h6 class="fw-bold mt-3 text-primary">IV. Licensure and Legal Compliance</h6>
                    <p>RENTER will comply with all applicable laws relating to holding of licensure to operate the vehicle, and pertaining to operation of motor vehicles including but not limited to LTO and other relevant traffic regulations.</p>

                    <h6 class="fw-bold mt-3 text-danger">V. Restrictions on Use</h6>
                    <p>RENTER should not operate the vehicle in the following cases: In motor sports events, in illegal transactions or activities, carrying persons or anything for hire, parking the vehicle in unsecured places, towing or pushing anything, transporting or getting onboard any kind of pet or animal, smoking inside the vehicle, carrying anything of weight in excess of the vehicle’s maximum capacity, passing on roads that are not passable or not safe for the vehicle, unlawful, improper, or offensive use of vehicle equipment/tools/parts, the RENTER shall not assign nor transfer his right to use the vehicle to any third person without prior written consent from INSTACAR, nor mortgage or sell the said vehicle to any third person, otherwise, INSTACAR shall file appropriate action against the lessee.</p>

                    <h6 class="fw-bold mt-3 text-danger">VI. Coverage Area</h6>
                    <p>RENTER shall only use the vehicle within Panay Island unless written consent is provided by INSTACAR. If the vehicle is taken outside Panay Island or transported by any watercraft without consent, a fine of <strong>PHP 100,000</strong> shall be imposed. Additionally, INSTACAR reserves the right to report the violation to the appropriate authorities, including the Highway Patrol Group (HPG), for the immediate apprehension of the unit.</p>

                    <h6 class="fw-bold mt-3 text-primary">VII. Authorized Operators</h6>
                    <p>RENTER will not allow any other person to operate the Rented Vehicle unless identified in Annex A.</p>

                    <h6 class="fw-bold mt-3 text-primary">VIII. Traffic Violations and Penalties</h6>
                    <p>RENTER shall be responsible for all fines, penalties, and liabilities resulting from any traffic or road violations incurred during the rental period. If RENTER receives a traffic violation or is issued a ticket that imposes a penalty on the rental unit, they must report it to INSTACAR within 24 hours of issuance. Failure to report within the given timeframe will result in the RENTER being charged double the total penalty amount, including any additional fees due to delayed payment caused by the RENTER’S failure to report on time. RENTER must settle the total amount immediately upon notification.</p>

                    <h6 class="fw-bold mt-3 text-primary">IX. Cleaning Fee</h6>
                    <p>The vehicle will be handed over to the RENTER washed and clean, and should be returned also clean with the same cleanliness during handover. Otherwise, RENTER will be charged a PHP 200 washing fee.<br>
                    <strong>Smoking, Carrying of Fresh Fish, Dried Fish, Animals, Foods, Spillage, Vomiting, or Any Items That Cause Odor and Stains:</strong> A cleaning fee of <strong>PHP 2,000</strong> will be charged to RENTER for detailed cleaning services required to address the odor and dirt caused by smoking, carrying fresh fish, dried fish, any animals, food items, or any items that may cause odor and stains on the vehicle, as well as incidents involving spillage or vomiting.</p>

                    <h6 class="fw-bold mt-3 text-primary">X. Key Replacement Charges</h6>
                    <p>If the vehicle key is locked inside the vehicle and RENTER requests a duplicate key, the following charges will apply:<br>
                    - Provincial: P5,000 plus gasoline charges for round-trip delivery.<br>
                    - Iloilo City: P1,000 plus gasoline charges for round-trip delivery.<br>
                    In the event the key is lost, a charge will be applied based on the price of replacing the key from the authorized service center (casa).</p>

                    <h6 class="fw-bold mt-3 text-primary">XI. Fuel</h6>
                    <p>Fuel charges shall be on the sole account of RENTER; RENTER is responsible for returning the vehicle with the same amount of fuel in the tank as when received. Instacar will not refund the extra fuel if the rented vehicle is returned with more than the amount when it was received by the RENTER. The RENTER must use the correct fuel type specified for the vehicle. Any damage resulting from the use of incorrect fuel will be fully charged to the renter.</p>

                    <h6 class="fw-bold mt-3 text-primary">XII. Vehicle Condition</h6>
                    <p>RENTER shall return the vehicle in the same condition it was delivered except for the normal wear and tear.</p>

                    <h6 class="fw-bold mt-3 text-primary">XIII. Retrieval of Vehicle</h6>
                    <p>Instacar reserves the right to retrieve the rented vehicle at any time and from any location if the RENTER fails to fulfill their payment obligations.</p>

                    <h6 class="fw-bold mt-3 text-primary">XV. Failure to Return Vehicle</h6>
                    <p>If RENTER fails to return the vehicle on the due date and time without a permitted extension from Instacar, RENTER will be deemed to be in unlawful possession of the vehicle and to have authorized the issuance of a warrant for the arrest of the RENTER.</p>

                    <h6 class="fw-bold mt-3 text-primary">XVI. Extension of Rental Period</h6>
                    <p>If the RENTER fails to return the vehicle within the stipulated time, the RENTER agrees to pay <strong>PHP 200 per hour (PHP 250 for vans)</strong> for the first 6 hours. In excess of six hours, the RENTER must pay the daily rate for the rented vehicle or van, depending on the type.</p>

                    <h6 class="fw-bold mt-3 text-primary">XVIII. Responsibility for Damages and Repairs</h6>
                    <p>The RENTER will shoulder all expenses for any damage, replacement of missing parts and accessories, and the full daily rental rate of the damaged vehicle until it has been fixed or restored to its original condition.</p>

                    <h6 class="fw-bold mt-3 text-primary">XX. Insurance Coverage</h6>
                    <p>If the Rental Vehicle is damaged or destroyed while in the possession of the Renter, the Renter may choose to use the vehicle’s comprehensive insurance. If the insurance company denies coverage, the Renter will be responsible for covering the full cost of the damage.</p>

                    <h6 class="fw-bold mt-3 text-primary">XXI. Service Fee for Assistance</h6>
                    <p>Within City Limits: PHP 1,000 / Outside City Limits: PHP 5,000 / Fuel Cost: The RENTER shall also cover the fuel expenses for the round-trip travel of the assistance vehicle.</p>

                    <h6 class="fw-bold mt-3 text-primary">XXIII. Payment Terms and Conditions</h6>
                    <p><strong>Rental Payment Terms:</strong><br>
                    1. The renter must pay a non-refundable reservation fee of 5% of the total rental rate to confirm the booking.<br>
                    2. The remaining balance for the entire rental period must be fully paid upon handover of the unit.<br>
                    <strong>Damage Payment Settlement Terms:</strong><br>
                    - Minor Damages (Below PHP 10,000) – Payment due within the day.<br>
                    - Moderate Damages (PHP 10,000 - PHP 50,000) – Payment due within 7 days.<br>
                    - Major Damages (Above PHP 50,000 / Total Wreck) – 50% upfront within 7 days, balance payable within 30 days.</p>

                    <h6 class="fw-bold mt-3 text-primary">XXIV. Cancellation and Refund Policy</h6>
                    <p>Once the reservation is confirmed and the reservation fee is received, there will be no refund in case of cancellation or change of schedule.</p>', timestamptz '2026-09-12T12:15:35', null)
on conflict (id) do nothing;

-- Re-align the identity sequences with the legacy ids.
select setval(pg_get_serial_sequence('public.branches', 'id'), coalesce((select max(id) from public.branches), 1));
select setval(pg_get_serial_sequence('public.users', 'id'), coalesce((select max(id) from public.users), 1));
select setval(pg_get_serial_sequence('public.cars', 'id'), coalesce((select max(id) from public.cars), 1));
select setval(pg_get_serial_sequence('public.car_schedules', 'id'), coalesce((select max(id) from public.car_schedules), 1));
select setval(pg_get_serial_sequence('public.bookings', 'id'), coalesce((select max(id) from public.bookings), 1));
select setval(pg_get_serial_sequence('public.booking_payments', 'id'), coalesce((select max(id) from public.booking_payments), 1));
select setval(pg_get_serial_sequence('public.booking_photos', 'id'), coalesce((select max(id) from public.booking_photos), 1));
select setval(pg_get_serial_sequence('public.booking_remarks', 'id'), coalesce((select max(id) from public.booking_remarks), 1));
select setval(pg_get_serial_sequence('public.reviews', 'id'), coalesce((select max(id) from public.reviews), 1));
select setval(pg_get_serial_sequence('public.contact_messages', 'id'), coalesce((select max(id) from public.contact_messages), 1));
select setval(pg_get_serial_sequence('public.site_content', 'id'), coalesce((select max(id) from public.site_content), 1));
