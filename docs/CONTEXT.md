# InstaCar Project Context

Read this before every task. This project is a migration from the working PHP car-rental system into a Next.js + Supabase application.

## Purpose

InstaCar is a rental platform for booking cars, verifying users, managing branch operations, and tracking payments and remittances. The actual database and app behavior are defined by the legacy PHP project and the SQL dump in `car-rental/if0_42471936_car_rental.sql`.

The repository contains two versions of the same product:

- `car-rental/` — the current PHP + MySQL implementation with the real business rules.
- `next-instacar/` — the target app using Next.js and Supabase.

## Principles

- The PHP app and SQL schema are the source of truth.
- The new app must preserve the same functions, status values, and rules.
- The design should remain similar to the old system, but the code should move to modern Next.js patterns.
- Booking logic, branch scope, user ownership, and payment tracking must be enforced server-side.
- Supabase Auth and RLS should replace the PHP session and permission logic without changing the product behavior.

## Roles

| Role | Who | Scope |
|---|---|---|
| user | Customer account | Own bookings, upload proof, manage personal bookings |
| staff | Staff staff account | Assigned branch or operational tasks |
| operator | Fleet operator | Manage assigned vehicle and booking operations |
| admin | Admin account | Full management of bookings, vehicle status, reports, and remittances |

Rules:
- Role checks must come from the backend.
- Operators and staff are branch-scoped.
- Admin-only actions must be restricted.

## Scope

The current app covers:

1. Browse available cars by branch and type.
2. Create a booking with date, time, pickup/delivery preference, and proof upload.
3. Validate overlapping car bookings and schedule conflicts.
4. Confirm or release bookings based on approval flow.
5. Attach payment proof, remarks, and booking photos.
6. Track booking state through `Pending`, `Confirmed`, `Released`, `Completed`, and `Cancelled`.
7. Review settlement, remittance, and review data for staff and operators.

## Business rules from the actual app

| ID | Rule |
|---|---|
| BR01 | A car cannot overlap another booking for the same period. |
| BR02 | Booking type is either `online` or `manual`. |
| BR03 | Fulfillment type is either `Pickup` or `Delivery`. |
| BR04 | Booking status follows the legacy enum: `Pending`, `Confirmed`, `Released`, `Completed`, `Cancelled`. |
| BR05 | A booking can carry guest info, ID paths, payment proof paths, delivery address, and remarks. |
| BR06 | `booking_payments` records the financial details tied to each booking. |
| BR07 | `car_schedules` stores maintenance and unavailable periods for a vehicle. |
| BR08 | Reviews and admin replies are tracked separately from bookings but linked by `booking_id`. |
| BR09 | `site_content` holds rental agreement and dynamic content values. |

## Security and privacy

- Validate all input server-side.
- Keep user ownership and branch scope checks in the backend.
- Use Supabase Auth and RLS instead of trusting the browser.
- Protect payment proof and ID photo files behind proper access policies.
- Keep admin and operator functions separated from user access.

## Authentication (Supabase Auth ↔ legacy users)

`public.users` stays the account master (name, e-mail, role, branch,
`is_verified`, password). Supabase Auth is a 1:1 shadow keyed by
`public.users.auth_id`:

```
public.users.id  <->  public.users.auth_id  ->  auth.users.id
```

- Every legacy row owns exactly one `auth.users` row. The link is created by
  a BEFORE trigger on `public.users`; AFTER triggers mirror changes in both
  directions (password, e-mail, name, phone, role, verification).
- `public.users.password` keeps the canonical PHP `$2y$` bcrypt hash and is
  copied into `auth.users.encrypted_password`. GoTrue verifies PHP hashes
  natively, so the legacy credentials keep working unchanged.
- `public.users.is_verified` maps to `auth.users.email_confirmed_at`.
- `auth.users.phone` stays NULL: legacy phones are duplicated and GoTrue keeps
  a unique index on that column.
- An account created through Supabase Auth (self-service register, Google)
  gets a `user`-role `public.users` row automatically; it can never escalate
  its own role.
- Admin-created accounts go through the Auth Admin API, then the matching
  `public.users` row is inserted with its `auth_id`.
- Recursion between the two directions is stopped with the transaction-local
  GUC `instacar.auth_sync_direction`.

Migrations `20260101000700_auth_users_sync.sql`,
`20260101000800_auth_user_provisioning.sql` and `supabase/backfill-auth.sql`
implement this. `supabase/apply-all.sql` contains all of them, so a fresh
bootstrap creates and links the Auth accounts of the seeded users.

### E-mail delivery and Google sign-in (project settings)

These are project-level settings, not code:

- **E-mail confirmation is ON** (`mailer_autoconfirm: false`), matching the
  legacy `registerverify.php` flow. Supabase's built-in mailer is limited to
  **2 messages per hour** and needs a custom SMTP server for production
  (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` in `.env.local` are only
  read by the app's own mailer, not by Supabase Auth — configure
  *Authentication → Emails* in the dashboard). Until then a sign-up or
  password-reset mail may be rate-limited; the form surfaces the GoTrue error.
- **Google sign-in** is wired in the UI (`/auth/callback`) but disabled on the
  project (`external_google_enabled: false`) because no Google OAuth client is
  configured. To enable it, add a Google OAuth client in the Supabase
  dashboard and whitelist this callback URL:
  `https://hdzqeenmhtaynyklatgx.supabase.co/auth/v1/callback`.
- `NEXT_PUBLIC_SITE_URL` must match the deployment origin; it is used for the
  e-mail confirmation and password-reset redirect links. The default local
  value is `http://localhost:3000`.

## Repo layout

```text
instacar/
├── car-rental/
│   ├── config/
│   ├── pages/
│   ├── process/
│   ├── public/
│   ├── index.php
│   ├── login.php
│   ├── register.php
│   ├── README.md
│   └── if0_42471936_car_rental.sql
├── next-instacar/
│   ├── src/
│   ├── public/
│   ├── docs/
│   ├── AGENTS.md
│   ├── package.json
│   └── README.md
└── README.md
```

## Working conventions

- Treat the SQL dump and PHP app as the canonical business source.
- Preserve existing names like `bookings`, `cars`, `branches`, `users`, and `booking_payments` in the new app.
- Keep the same booking flow and transaction structure, even when reimplementing in Next.js.
- Do not replace the app with a new domain model that disagrees with the SQL schema.
