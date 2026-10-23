-- ============================================================================
-- InstaCar — bind the real fleet photos to the seeded cars
-- ----------------------------------------------------------------------------
-- The legacy `cars.image_path` values in the SQL dump
--
--   car_6a967ac4ba12c_1788246724.jpg
--   car_6a967b467679c_1788246854.jpg
--   ...
--
-- point at files that are no longer part of `car-rental/public/assets/images/
-- cars/`. The folder now holds the operator's current photo set (uploaded from
-- Facebook / the admin panel), so every seeded car would render the
-- `default.png` sentinel.
--
-- This script binds the 11 current photos to the 11 seeded cars **in id
-- order**. The pairing is positional, not verified against the photo content:
-- the legacy admin panel is the source of truth for re-assigning a photo to a
-- vehicle (`pages/shared/cars.php` -> edit car -> car photo).
--
-- Everything here is idempotent and reversible: the original values stay in
-- `supabase/seed.sql`.
--
-- The photos themselves live in the public `car-images` bucket:
--   https://<project>.supabase.co/storage/v1/object/public/car-images/<name>
-- ============================================================================

-- id 13 | Honda City
update public.cars set image_path = '1774237180_653463773_915907377693009_8487592824306674200_n.jpg' where id = 13;
-- id 14 | Toyota Wigo
update public.cars set image_path = '1774237284_651194120_1205869804701000_8633291639692457117_n.jpg' where id = 14;
-- id 15 | Nissan Navara
update public.cars set image_path = '1774237334_653463773_915907377693009_8487592824306674200_n.jpg' where id = 15;
-- id 16 | Honda City
update public.cars set image_path = '1774237395_653874605_1404859887993080_1903131416981550368_n.jpg' where id = 16;
-- id 17 | Mitsubishi Xpander
update public.cars set image_path = '1774237457_654000464_1256282399979877_1561735839736806923_n.jpg' where id = 17;
-- id 18 | Mitsubishi Mirage G4
update public.cars set image_path = '1774237501_654059922_1654245925745876_6811578096547993538_n.jpg' where id = 18;
-- id 19 | Mitsubishi Mirage G4
update public.cars set image_path = '1774237569_653419277_1292284916130429_4945150164135400678_n.jpg' where id = 19;
-- id 20 | Mitsubishi Mirage G4
update public.cars set image_path = '1774245089_654886198_122133862785100913_4461807217810708980_n.jpg' where id = 20;
-- id 21 | Honda Citty
update public.cars set image_path = '1774245108_654886198_122133862785100913_4461807217810708980_n.jpg' where id = 21;
-- id 22 | Nissan Urvan (High Roof)
update public.cars set image_path = 'car_6a34bf94cd461_1781841812.webp' where id = 22;
-- id 23 | Toyota Fortuner
update public.cars set image_path = 'car_6aa4e5839cd31_1789191555_0.jpg' where id = 23;

-- The remaining fleet photo (`car_6aa8f3d56263e_1789457365_0.jpg`) is kept as
-- an additional gallery entry on the Toyota Fortuner, because the legacy
-- `cars.image_path` column stores a comma separated list of photos.
update public.cars
   set image_path = image_path || ',car_6aa8f3d56263e_1789457365_0.jpg'
 where id = 23;
