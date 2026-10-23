# Supabase Storage — image buckets

The PHP app stored every uploaded file on disk under
`car-rental/public/assets/images/` and kept only the *file name* (or
`<folder>/<file>`) in MySQL. The Next.js app keeps the exact same database
values and serves the files from Supabase Storage instead of local disk.

## Bucket mapping

| Legacy folder              | Bucket              | Public | Database column                              |
| -------------------------- | ------------------- | ------ | -------------------------------------------- |
| `images/cars/`             | `car-images`        | yes    | `cars.image_path` (`"a.jpg,b.jpg"`)          |
| `images/customers/`        | `booking-photos`    | no     | `booking_photos.file_name`                    |
| `images/ids/<folder>/`     | `booking-uploads`   | no     | `bookings.primary_id_path`, `secondary_id_path`, `proof_billing_path`, `proof_payment_path` |
| `images/remittances/`      | `remittance-photos` | no     | `operator_remittance_photos.file_name`, `staff_fee_remittance_photos.file_name` |
| `images/qr_code_payment.png` | `site-assets`     | yes    | – (site content)                              |

Object keys are byte-identical to the legacy paths, so **no data migration is
required** — only the URL builder changed:

```
cars.image_path = "car_x.jpg"                -> {SUPABASE_URL}/storage/v1/object/public/car-images/car_x.jpg
bookings.primary_id_path = "User_9/primary_1.webp"
                                             -> {SUPABASE_URL}/storage/v1/object/public/booking-uploads/...   (signed)
booking_photos.file_name = "customer_9_x.png" -> {SUPABASE_URL}/storage/v1/object/public/booking-photos/...     (signed)
```

The private buckets (`booking-uploads`, `booking-photos`,
`remittance-photos`) are read through **signed URLs** created on the server —
see `signedFileUrl()` / `signedFileUrls()` in `src/lib/storage.ts`.

Helper functions in `src/lib/storage.ts`:

| Function                | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `carImageUrls(path)`    | every photo of a car, honouring the `default.png` sentinel |
| `publicFileUrl(b, p)`   | public URL of an object in a public bucket           |
| `bookingUploadKey(p)`   | object key of a customer ID / proof file             |
| `siteAssetUrl(p)`       | payment QR code and favicons                         |
| `signedFileUrl(...)`    | signed URL for a private bucket object               |
| `uploadFile(...)`       | validated upload (5 MB, jpg/png/webp/pdf)            |

## Step 1 — create the database, buckets and policies

`supabase/apply-all.sql` is a single paste-ready script (schema + RLS +
buckets + policies + auth sync triggers + the 57 legacy seed rows + the
Supabase Auth backfill). Everything in it is idempotent. The auth part is
described in [CONTEXT.md](CONTEXT.md#authentication-supabase-auth--legacy-users)
and creates a working `auth.users` row for every seeded account.

**Option A — Supabase Dashboard**
1. Dashboard → **SQL Editor** → *New query*
2. Open `supabase/apply-all.sql`, paste everything, **Run**

**Option B — Supabase CLI**
```bash
npx supabase login
npx supabase link --project-ref hdzqeenmhtaynyklatgx
npx supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

## Step 2 — upload the images

The upload script needs the **service role key**
(Dashboard → *Project Settings → API Keys* → `sb_secret_...`, the new name for
`service_role`). Add it to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Then:

```bash
cd next-instacar

# cars only (default) -> car-images bucket
node scripts/upload-images.mjs

# every legacy folder -> car-images + booking-uploads + booking-photos + site-assets
node scripts/upload-images.mjs --scope=all

# preview without uploading
node scripts/upload-images.mjs --dry-run
```

The script creates any missing bucket, uploads every file with `upsert`, and
prints a verification listing at the end. It never uploads:

* `.htaccess`, `index.html` (server files of the legacy folder)
* files with an unsupported extension — e.g. the three `*.sql` files that the
  legacy app wrote into `images/ids/guest_1781660241_1781660241/` and
  `images/ids/guest_1781660493_1781660493/`

## Step 3 — check

```bash
node scripts/upload-images.mjs --dry-run          # expected: 13 car files
curl -I https://hdzqeenmhtaynyklatgx.supabase.co/storage/v1/object/public/car-images/default.png
```

## Notes

* **Missing car photos.** The `cars.image_path` values in the legacy dump
  (`car_6a967ac4ba12c_1788246724.jpg`, …) point at files that are not part of
  the current `images/cars/` folder, so those cars show the `default.png`
  sentinel — exactly like the legacy `onerror` fallback in
  `booking_details.php` / `cars.php`.
* **`default.png` is a real file** in `images/cars/` and is uploaded like every
  other car image, so the fallback resolves to a valid bucket URL.
* **Legacy names stay valid.** New uploads keep the legacy naming rules
  (`car_<time>_<uniqid>.<ext>`, `customer_<booking>_<time>_<uniqid>.<ext>`,
  `<customerFolder>/primary_<time>.<ext>`) so the database values and the
  bucket keys stay consistent.
