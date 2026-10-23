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
  - Company-wide revenue matrix and KPI dashboards across all physical branches.
  - Income and expense tracking with date range filtering and CSV export.
  - Staff management: branch assignments, account creation, and credential management.
  - Operator remittance settlement and disbursement tracking.
  - Public contact message inbox and customer review moderation.

### Booking & Operational Workflows
- **State Machine Validation:** Enforces strict transition sequences preventing invalid state jumps (e.g., cannot release an unconfirmed booking).
- **Automated Overlap Detection:** Validates proposed rental periods against both existing customer bookings and operator blackout schedules to eliminate double bookings.
- **Multi-Part Storage Handling:** Secure uploads to Supabase Storage with strict MIME-type allowlists (JPEG, PNG, WebP, PDF) and 5MB size limits.
- **Transactional Notifications:** Automated email notifications for booking confirmation, vehicle release, return completion, and contact inquiries.

### Security & Reliability
- **Row-Level Security (PostgreSQL RLS):** Database policies enforce strict branch tenancy for staff and account isolation for customers and operators.
- **Server Action Protection:** Authenticated session guards (`requireRole`, `requireSession`) on all mutations.
- **Rate Limiting:** Sliding-window rate limiter protecting authentication actions and public contact submissions from brute-force and volumetric floods.
- **OWASP HTTP Security Headers:** Preconfigured `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **Input Sanitization & Schema Validation:** Strict input validation using Zod and secure URL redirect sanitization.

---

## Tech Stack

- **Framework:** Next.js 16.4 (App Router, React Server Components, Server Actions, Partial Prerendering, Turbopack)
- **Frontend & UI:** React 19, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Date-fns
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security Policies, GoTrue Auth with SSR Cookie Sessions, Supabase Storage)
- **Language & Typing:** TypeScript 5.9 with strict type-checking
- **Validation:** Zod schema validation
- **Email Service:** Nodemailer for SMTP transactional messaging
- **Testing & Quality:** Node.js Native Test Runner (`npm test`), ESLint, Turbopack static optimization
