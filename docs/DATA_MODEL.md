# InstaCar Data Model

This project is a direct migration of the legacy PHP system to a modern Next.js + Supabase stack. The actual database structure is defined by `car-rental/if0_42471936_car_rental.sql`, and that schema must be preserved in the new app.

## Canonical schema source

The SQL dump is the source of truth for:

- table names
- field names
- enum values
- relationships
- booking and payment behavior

## Core tables

| Table | Purpose |
|---|---|
| `users` | Customer, admin, operator, and staff accounts |
| `branches` | Rental branches and locations |
| `cars` | Vehicles and their pricing metadata |
| `car_schedules` | Maintenance or unavailable periods for a vehicle |
| `bookings` | Reservation records and booking status |
| `booking_payments` | Fee breakdown, settlement, and remittance fields |
| `booking_photos` | Photos attached to a booking |
| `booking_remarks` | Staff remarks for a booking |
| `reviews` | User review records and admin reply |
| `contact_messages` | Public contact form submissions |
| `expenses` | Operational expense entries |
| `site_content` | Static content like rental agreements |
| `operator_remittances` | Operator-level remittance records |
| `operator_remittance_photos` | Proof photos for remittance |
| `staff_fee_remittances` | Staff fee settlement records |
| `staff_fee_remittance_photos` | Proof photos for staff remittance |

## Key relationships

- `users` can create or own bookings.
- `branches` contain cars and many bookings.
- `cars` are assigned to a branch and have multiple booking records over time.
- `bookings` belong to a `user`, `car`, and optional `branch`.
- `booking_payments` is a one-to-one detail record for a booking.
- `booking_photos` and `booking_remarks` attach to a booking.
- `reviews` are connected to a user and booking.
- `car_schedules` mark a car unavailable for certain dates.

## Accounts and Supabase Auth

The legacy PHP app kept the account in the `users` table and verified the
bcrypt hash in `users.password` with `password_verify()`. Supabase Auth
replaces the PHP session, so every legacy account needs a matching
`auth.users` row.

The link is **1:1** and `public.users` stays the source of truth:

```text
public.users.id  <->  public.users.auth_id  ->  auth.users.id
```

| `public.users` | `auth.users` | Notes |
|---|---|---|
| `id` | `id` (uuid) | linked through `users.auth_id` |
| `email` | `email` | the key GoTrue looks the account up with |
| `password` | `encrypted_password` | the canonical PHP bcrypt hash (`$2y$`) |
| `is_verified` | `email_confirmed_at` | `NULL` while the e-mail is unconfirmed |
| `name`, `phone` | `raw_user_meta_data` | mirrored both ways |
| `role`, `branch_id` | — | only in the legacy table, never trusted from the client |

Rules:

- `users.auth_id` is a foreign key to `auth.users(id)` with `ON DELETE CASCADE`
  (`users_auth_id_fkey`), so deleting a legacy account deletes the Supabase
  account too.
- GoTrue verifies PHP `$2y$` hashes natively, so the existing credentials keep
  working without a password migration.
- `auth.users.phone` stays `NULL`: the legacy table has duplicate phone
  numbers and GoTrue keeps a unique index on that column.
- `auth.identities.email` is a generated column
  (`lower(identity_data ->> 'email')`) and is never written directly.
- `auth.users.confirmed_at` is generated as well
  (`LEAST(email_confirmed_at, phone_confirmed_at)`).
- `users.email` is unique in the legacy schema; the seed aliased the three
  duplicate addresses as `<local>+<id>@<domain>`.

### Sync triggers

| Trigger | Direction | Effect |
|---|---|---|
| `trg_users_link_auth` | `public.users` (before) | resolves `auth_id` and creates the `auth.users` row before the foreign key is verified |
| `trg_users_sync_auth` | `public.users` (after) | mirrors role, branch, name, phone and password into `auth.users` |
| `trg_auth_users_sync_legacy` | `auth.users` (after) | mirrors a GoTrue password / e-mail / profile change back into `public.users` and sets `is_verified` |
| `trg_auth_users_provision_legacy` | `auth.users` (after insert) | creates the legacy `users` row for a self-service registration |
| `trg_users_guard_privileges` | `public.users` (before) | only an admin may change `role` or `branch_id` |

Both directions are protected against recursion with the transaction local
flag `instacar.auth_sync_direction` (`users_to_auth` / `auth_to_users`).

Migrations:

- `supabase/migrations/20260101000700_auth_users_sync.sql`
- `supabase/migrations/20260101000800_auth_user_provisioning.sql`

## Matching the SQL table design

### `users`

Important fields:

- `id`
- `google_id`
- `auth_id` (Supabase Auth account, 1:1 — see below)
- `name`
- `email`
- `password`
- `phone`
- `role`
- `branch_id`
- `created_at`
- `reset_token`
- `token_expiry`
- `verification_token`
- `is_verified`

Role examples in the current data:

- `admin`
- `operator`
- `staff`
- `user`

### `cars`

Important fields:

- `id`
- `user_id`
- `branch_id`
- `brand`
- `model`
- `type`
- `fuel_type`
- `plate_number`
- `image_path`
- `price_24_hours`
- `price_10_hours`
- `price_12_hours`
- `operator_24_hours`
- `status`
- `transmission`
- `capacity`
- `color`
- `ext_price_1_6`
- `ext_price_7_10`
- `ext_price_11_12`
- `ext_price_13_24`

Car status values in the system:

- `Available`
- `Active`
- `Maintenance`
- `Not Available`
- `Reserved`

### `bookings`

Important fields:

- `id`
- `user_id`
- `created_by`
- `last_action_by`
- `last_action_at`
- `last_action_type`
- `branch_id`
- `guest_name`
- `phone_number`
- `gmail`
- `primary_id_path`
- `secondary_id_path`
- `car_id`
- `start_date`
- `end_date`
- `pickup_time`
- `return_time`
- `total_price`
- `status`
- `booking_type`
- `fulfillment_type`
- `delivery_address`
- `return_delivery_address`
- `discount_price`
- `down_payment`
- `extension_price`
- `extension_hours`
- `proof_billing_path`
- `proof_payment_path`
- `remarks`
- `delivery_fee`
- `pickup_fee`

Status enum:

- `Pending`
- `Confirmed`
- `Released`
- `Completed`
- `Cancelled`

Types:

- `online`
- `manual`

Fulfillment:

- `Pickup`
- `Delivery`

### `booking_payments`

Important fields:

- `id`
- `booking_id`
- `daily_rent`
- `carwash`
- `extension_fee`
- `delivery_fee`
- `jer_delivery_fee`
- `pickup_fee`
- `jer_pickup_fee`
- `fuel`
- `driver_fee`
- `damage_fee`
- `agent_fee`
- `others`
- `total_gross`
- `discount_amount`
- `total_net`
- `settled_by`
- `settled_at`
- `operator_share`
- `remitted_amount`
- `remittance_date`
- `owner_balance`
- `remarks`

This table is the financial record for a booking and must remain tied to it.

## Example schema mapping to Supabase

```sql
create table users (
  id bigint primary key,
  google_id text,
  name text not null,
  email text not null unique,
  password text,
  phone text not null,
  role text not null,
  branch_id bigint,
  created_at timestamptz not null default now(),
  reset_token text,
  token_expiry timestamptz,
  verification_token text,
  is_verified boolean default false
);

create table branches (
  id bigint primary key,
  name text not null,
  address text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table cars (
  id bigint primary key,
  user_id bigint,
  branch_id bigint,
  brand text,
  model text,
  type text,
  fuel_type text,
  plate_number text unique,
  image_path text,
  price_24_hours integer,
  status text,
  transmission text,
  capacity integer,
  created_at timestamptz default now(),
  operator_24_hours numeric(10,2),
  ext_price_1_6 numeric(10,2),
  color text,
  price_10_hours numeric(10,2),
  operator_10_hours numeric(10,2),
  price_12_hours numeric(10,2),
  operator_12_hours numeric(10,2),
  ext_price_7_10 numeric(10,2),
  ext_price_11_12 numeric(10,2),
  ext_price_13_24 numeric(10,2)
);
```

## Migration note

The new app must mirror this schema and its logic. Do not invent new fields or a new role system without checking the actual legacy app and SQL file first.
