# InstaCar

InstaCar is a modern, full-stack car rental and fleet management platform migrated from legacy PHP/MySQL to Next.js and Supabase. The system powers end-to-end vehicle rentals with multi-tier duration pricing, branch-level physical operations, partner vehicle fleet management, automated availability scheduling, customer reservations, and financial settlements.

---

## About

InstaCar connects vehicle operators, branch operations staff, system administrators, and rental customers into a unified, secure platform:
- **Customers** can browse available vehicles across branches, submit rental bookings with flexible durations, choose fulfillment preferences (pickup or delivery), and track their rental lifecycle.
- **Branch Staff** manage day-to-day physical vehicle releases, returns, walk-in reservations, and payment settlements restricted to their assigned branch.
- **Vehicle Operators** register and monitor their personal vehicle fleet, block unavailable dates on the interactive calendar, and track net earnings and remittances.
- **Administrators** possess system-wide oversight over company gross income, cross-branch analytics, operator remittances, user roles, staff assignments, and platform settings.

---

## Features

### Role-Based Access Control (RBAC)
- **Customer Portal (`user`):**
  - Interactive car catalog with filtering by branch, vehicle category, transmission, and seat capacity.
  - Multi-tier rental duration options (10 hours, 12 hours, 24 hours) with real-time price calculation.
  - Fulfillment selection: Self-pickup or delivery with address specification.
  - Secure verification document uploads (Primary ID, Secondary ID, Proof of Billing, Proof of Payment).
  - My Bookings dashboard tracking current, upcoming, and past rental status with digital review submission.
- **Branch Operations (`staff`):**
  - Branch-isolated dashboard showing fleet availability and pending actions.
  - Online booking verification and status lifecycle transitions (`Pending` &rarr; `Confirmed` &rarr; `Released` &rarr; `Completed`).
  - Manual walk-in booking creation with automated overlap validation.
  - Settlement processing: breakdown of rent, extension fees, carwash, delivery/pickup fees, driver fees, and damage adjustments.
  - Customer directory and vehicle check-in/out inspections.
- **Fleet Partner Portal (`operator`):**
  - Vehicle management: listing details, plate numbers, and tier pricing.
  - Personal calendar scheduling to block out vehicle maintenance or private usage periods.
  - Revenue analytics showing completed rental earnings, company cuts, and net payout balances.
  - Remittance history log with payment receipts.
- **System Administration (`admin`):**
  - Consolidated **Financial Intelligence Center (`/admin/financials`)** with cross-branch telemetry, fleet revenue matrices, expense ledgers, and P&L income statements.
  - Consolidated **Staff Console (`/admin/staff`)** managing dispatchers, performance KPIs, and live activity feeds.
  - Operator remittance settlement and disbursement tracking.
  - Public contact message inbox and customer review moderation.

### Booking & Operational Workflows
- **State Machine Validation:** Enforces strict transition sequences preventing invalid state jumps (e.g., cannot release an unconfirmed booking).
- **Automated Overlap Detection:** Validates proposed rental periods against both existing customer bookings and active `car_schedules` maintenance blackouts to eliminate double bookings.
- **Multi-Part Storage Handling:** Secure uploads to Supabase Storage with strict MIME-type allowlists (JPEG, PNG, WebP, PDF) and 5MB size limits.
- **Transactional Notifications:** Dual-tier transactional email architecture with automated Resend &rarr; SMTP failover.

### Security & Reliability
- **Row-Level Security (PostgreSQL RLS):** Database policies enforce strict branch tenancy for staff and account isolation for customers and operators.
- **Server Action Protection:** Authenticated session guards (`requireRole`, `requireSession`) on all mutations.
- **Rate Limiting:** Sliding-window rate limiter with client IP sanitization (`x-forwarded-for`) protecting authentication actions.
- **OWASP HTTP Security Headers:** Preconfigured `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Input Sanitization & Schema Validation:** Strict numeric bounds validation and URL redirect sanitization.

---

## Phase 2 Architecture & Consolidation Changelog

### 1. Financial Intelligence Center (`/admin/financials`)
Consolidated 4 legacy reporting pages into a single financial command center:
- **Unified Route:** `/admin/financials` featuring 4 synchronized sub-views:
  - `?tab=overview`: High-level executive KPI cards, interactive SVG annual telemetry chart, vehicle profit & loss ledger, and operating expense ledger dialog (`ExpenseManager`).
  - `?tab=revenue`: Fleet revenue matrix across all 12 calendar months with period filters (`all`, `this_month`, `last_30d`, `this_quarter`).
  - `?tab=expenses`: Category-level fee ledger (daily rent, carwash, fuel, repair, delivery/pickup fees) by vehicle and month.
  - `?tab=income`: Income statement table with year selector, print PDF export, and instant Excel workbook download (`/api/financials/export-excel`).
- **Persistent Filters:** Switching tabs preserves selected `branch`, `year`, `car`, `startDate`, and `endDate` query parameters via `buildTabHref`.
- **Permanent Redirects (HTTP 308):** Configured in `next.config.ts` from `/admin/analytics`, `/admin/admin_revenue`, `/admin/expenses`, and `/admin/income`.

### 2. Staff Management Console (`/admin/staff`)
Consolidated `/admin/users?role=staff` and `/admin/staff_manager` into a unified console:
- **Direct Creation & Management:** Header trigger for `+ Add Staff Member` (`AddUserDialog`) with branch assignment and credential provisioning.
- **Roster & Inline Actions:** Edit credentials, reassign branches, or deactivate/delete staff directly from roster cards (`EditUserDialog`, `DeleteUserDialog`).
- **KPI Metrics & Dispatch Stream:** Real-time metrics (Total Staff, Active This Week, Dispatched Bookings, Actions) paired with an active dispatch timeline showing handoffs, vehicle releases, and return inspections.
- **Permanent Redirect (HTTP 308):** Configured from `/admin/staff_manager` to `/admin/staff`.

### 3. Mobile Card Responsive Breakpoints (`< 768px`)
- Converted horizontally-overflowing data tables on `user/dashboard`, `user/mybookings`, and `staff/dashboard` into touch-friendly responsive cards on mobile (`< md` / `< 768px`) while retaining clean desktop tables (`>= md`).
- Unified all stats cards across the platform to use the semantic `StatCard` primitive.

### 4. Backend Consistency, Concurrency & Failover Fixes
- **Double-Booking & Maintenance Schedule Check:** Upgraded `hasOverlap` in `src/lib/actions/bookings.ts` to query `bookings` and `car_schedules` concurrently using `Promise.all()`, ensuring vehicles under maintenance or scheduled blocks cannot be double-booked.
- **Financial Status & Date Alignment:** Resolved UTC+8 Asia/Manila date drift and prevented cancelled reservations from inflating income statements in `src/lib/data/finance.ts` and `src/lib/data/analytics.ts`.
- **Resend → SMTP Automatic Failover:** In `src/lib/email-service.ts`, if Resend API rate-limits or fails, execution falls through to authenticated SMTP (Nodemailer) before throwing an error.
- **Rate-Limiter IP Sanitization:** In `src/app/api/auth/check-email/route.ts`, sanitized `x-forwarded-for` to take the leftmost client IP (`rawIp.split(",")[0].trim()`).
- **Webhook Security:** Strict 401 rejection for untrusted or unsigned production QStash webhook dispatches.

---

## Tech Stack

- **Framework:** Next.js 16.4 (App Router, React Server Components, Server Actions, Partial Prerendering, Turbopack)
- **Frontend & UI:** React 19, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Date-fns
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security Policies, GoTrue Auth with SSR Cookie Sessions, Supabase Storage)
- **Language & Typing:** TypeScript 5.9 with strict type-checking
- **Validation:** Zod schema validation
- **Email Service:** Nodemailer SMTP with Resend failover
- **Testing & Quality:** Node.js Native Test Runner (`npm test`), ESLint, Turbopack static optimization
