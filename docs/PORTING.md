# Porting guide — PHP page → Next.js route

This document is the contract for the page migration. Every page under
`src/app/(dash)/**` follows it.

The PHP app in `C:\instacar\car-rental` is the functional source of truth. The
design tokens, copy, section order, filters, table columns and actions must stay
the same. Only the implementation changes.

---

## 1. Route map

| PHP page | Next route |
| --- | --- |
| `pages/admin/dashboard.php` | `/admin/dashboard` |
| `pages/admin/admin_revenue.php` | `/admin/admin_revenue` |
| `pages/admin/bookings_online.php` | `/admin/bookings_online` |
| `pages/admin/bookings_manual.php` | `/admin/bookings_manual` |
| `pages/admin/branches.php` | `/admin/branches` |
| `pages/admin/contact_messages.php` | `/admin/contact_messages` |
| `pages/admin/expenses.php` | `/admin/expenses` |
| `pages/admin/income.php` | `/admin/income` |
| `pages/admin/operator_revenue.php` | `/admin/operator_revenue` |
| `pages/admin/remittance.php` | `/admin/remittance` |
| `pages/admin/review_list.php` | `/admin/review_list` |
| `pages/admin/settlements.php` | `/admin/settlements` |
| `pages/admin/staff_manager.php` | `/admin/staff_manager` |
| `pages/admin/users.php` | `/admin/users` |
| `pages/staff/dashboard.php` | `/staff/dashboard` |
| `pages/staff/bookings.php` | `/staff/bookings` |
| `pages/staff/bookings_manual.php` | `/staff/bookings_manual` |
| `pages/staff/customers.php` | `/staff/customers` |
| `pages/staff/staff_gross.php` | `/staff/staff_gross` |
| `pages/staff/staff_revenue.php` | `/staff/staff_revenue` |
| `pages/staff/staff_settlements.php` | `/staff/staff_settlements` |
| `pages/operator/dashboard.php` | `/operator/dashboard` |
| `pages/operator/bookings.php` | `/operator/bookings` |
| `pages/operator/revenue.php` | `/operator/revenue` |
| `pages/operator/view_car.php` | `/operator/view_car` |
| `pages/user/dashboard.php` | `/user/dashboard` |
| `pages/user/cars.php` | `/user/cars` |
| `pages/user/mybookings.php` | `/user/mybookings` |
| `pages/shared/booking_details.php` | `/shared/booking_details` |
| `pages/shared/calendar.php` | `/shared/calendar` |
| `pages/shared/cars.php` | `/shared/cars` |
| `pages/shared/my_car_schedules.php` | `/shared/my_car_schedules` |
| `pages/shared/profile.php` | `/shared/profile` |
| `pages/user/leave_review.php` | `/leave_review` |

The four role index pages (`/admin`, `/staff`, `/operator`, `/user`) already
redirect to the role home.

---

## 2. Page skeleton

`src/app/(dash)/layout.tsx` already renders `DashboardShell` (sidebar + topbar
+ `main`). A page **must not** render the shell again.

```tsx
import { requireRole } from "@/lib/auth";
import { readFlash } from "@/lib/flash";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";

export default async function ExamplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const flash = readFlash(params);

  // ... query through src/lib/data/*

  return (
    <>
      <PageHeader title="…" subtitle="…" description="…" actions={…} />
      <Flash {...flash} />
      {/* sections */}
    </>
  );
}
```

Rules:

- `searchParams` is a **Promise** in Next 16 — always `await` it.
- Use `requireRole(...)` / `requireSession()` from `@/lib/auth` at the top of
  every page, with exactly the roles the PHP page allowed.
- Server components only. Client interactivity goes in small
  `"use client"` components in `src/components/**`.
- `cacheComponents` is enabled: do not fetch with `no-store` or call
  `revalidatePath` during render. Read-only queries are fine.
- Do not add `export const dynamic = "force-dynamic"` unless a page truly
  needs it; the auth cookie access already makes these routes dynamic.

---

## 3. Shared UI components

Import from `@/components/common/*`:

| Component | Usage |
| --- | --- |
| `PageHeader` | `title`, optional `subtitle` (small uppercase kicker), `description`, `actions` |
| `Flash` | spread the `readFlash()` result: `<Flash {...flash} />` |
| `StatCard` | `label`, `value`, `hint?`, `icon?` (lucide component), `tone` = `default｜primary｜success｜warning｜danger｜info`. Default tone is the legacy white card with the yellow icon chip. |
| `SectionCard` | white card: `title`, `description`, `icon`, `actions`, `children`, `footer` |
| `DataTable` | `columns` (`{ key, header, numeric?, className?, cell }`), `rows`, `keyExtractor`, `emptyMessage`, `footer` |
| `StatusBadge` | booking/car status pill (colours from `STATUS_BADGE`) |
| `Money` | `value` → `₱1,234.00`; `showSign={false}` for plain numbers |
| `FilterBar` / `FilterField` / `filterControlClass` | the white filter card + labelled selects |
| `EmptyState` | `icon`, `title`, `description`, `action` |
| `PillTabs` | `tabs: { label, href, active, count? }[]` — the yellow pill strip |

Do not re-implement these. If a page needs a new small piece, put it in
`src/components/<area>/` and keep the legacy look.

### Buttons / inputs

The shadcn primitives live in `src/components/ui/*` (`button`, `input`,
`select`, `textarea`, `dialog`, `label`, `card`, `table`, `badge`, `tabs`,
`switch`, `checkbox`, `radio-group`). Prefer them over raw elements.

- Primary button: `<Button>` (the default variant is yellow).
- Secondary: `<Button variant="outline">`.
- Destructive: `<Button variant="destructive">` or `outline` + red text.
- Small table action: `<Button size="sm" variant="outline">`.

Icons come from `lucide-react`. Icons that do **not** exist in v1.61:
`Calendar3`, `Envelope`, `Loader2`, `Trash2`. Use `CalendarDays`, `Mail`,
`LoaderCircle`, `Trash`.

---

## 4. Data layer

Every query goes through `src/lib/data/*`. Do not put `.from(...)` queries in a
page unless the data layer genuinely lacks the query — in that case add the
query to the right data module first.

| Module | Exports |
| --- | --- |
| `scope.ts` | `branchFilter`, `insertBranchId`, `today`, `shiftDate`, `startOfMonth`, `endOfMonth`, `fetchRows`, `fetchRowsWithCount`, `fetchCount`, `applyBranch`, `readPage`, `readPerPage`, `currentSession`, `db`, `seesAllBranches` |
| `bookings.ts` | `listBookings`, `getBooking`, `bookingCounters`, `todaySchedule`, `recentBookings`, `customerBookings`, `overlappingBookings`, `calendarBookings`, `statusBreakdown` |
| `cars.ts` | `listCars`, `getCar`, `fleetCounters`, `carTypes`, `availableCars`, `operatorCars`, `listBranches`, `carSchedules`, `carBookings` |
| `users.ts` | `listUsers`, `listStaff`, `listOperators`, `getUser`, `customerDirectory`, `userCounters` |
| `finance.ts` | `listPayments`, `incomeStatement`, `fleetRevenue`, `expenseBreakdown`, `staffGross`, `staffRevenue`, `operatorRevenue`, `pendingSettlements`, `settlementSettlers`, `staffFeeRemittances`, `operatorRemittances`, `num`, `monthOf`, `yearOf`, `currentYear`, `yearOptions`, `PERIODS` |
| `misc.ts` | `listReviews`, `pendingReplyCount`, `listContactMessages`, `listBranchesWithCounts`, `siteContent` |
| `legacy-status.ts` | `bookingStatuses`, `carStatuses`, `OPEN_BOOKING_STATUSES`, `ACTIVE_CAR_STATUSES` |

Money is a JS `number`. PostgREST may return numeric columns as strings; use
`num()` from `finance.ts` (or `Number(value ?? 0)`) before arithmetic.

### Branch scoping

`branchFilter(session)` is the port of `branchScopeSql()`:

- admin → the branch selected in the topbar switcher (`"all"` = `null`)
- everyone else → their own branch

The data layer applies it automatically for listings. Only query directly when
the data layer has no helper.

---

## 5. Server actions

All mutations live in `src/lib/actions/*` and are `"use server"` modules that
take `FormData`:

| Module | Actions |
| --- | --- |
| `bookings.ts` | `updateBookingStatusAction`, `addManualBookingAction`, `updateBookingAction`, `updateReservationAction`, `savePaymentAction`, `resetSettlementAction`, `addCustomerInfoAction`, `deleteBookingItemAction`, `createBookingAction` |
| `cars.ts` | `saveCarAction`, `deleteCarAction`, `setMainImageAction`, `saveScheduleAction`, `deleteScheduleAction` |
| `users.ts` | `saveUserAction`, `deleteUserAction`, `saveBranchAction`, `toggleBranchAction` |
| `reviews.ts` | `replyReviewAction`, `saveReviewAction` |
| `profile.ts` | `updateProfileInfoAction`, `updatePasswordAction`, `uploadQrCodeAction`, `saveRentalAgreementAction` |
| `remittances.ts` | `recordOperatorRemittanceAction`, `deleteOperatorRemittanceAction`, `recordStaffRemittanceAction`, `deleteStaffRemittanceAction` |
| `contact.ts` | `sendContactMessageAction`, `markContactMessagesReadAction`, `deleteContactMessageAction` |

Usage in a server component:

```tsx
<form action={savePaymentAction}>
  <input type="hidden" name="booking_id" value={booking.id} />
  <Button type="submit">Save settlement</Button>
</form>
```

With a client component (confirmation dialog etc.) use `<form action={...}>`
directly when possible. Every action ends in `flashRedirect(path, tone, text)`
which redirects with `?success=` / `?error=` / `?warning=`. The destination page
renders `<Flash {...await readFlash(searchParams)} />`.

After a mutation the action already calls `revalidatePath` for the affected
routes.

Field names are documented in the action's JSDoc — match the PHP `$_POST`
keys.

---

## 6. Business rules that must survive the port

- Booking status flow: `Pending → Confirmed → Released → Completed`, and
  `Cancelled` from any state. The action module enforces it.
- Legacy statuses are translated by `legacy-status.ts` (`Approved` →
  `Confirmed`, `Active`/`Ongoing`/`Rented` → `Released`, car `Rented` →
  `Active`). Never compare against the legacy strings directly.
- `review_status` is lowercase (`pending`, `approved`, `rejected`, `replied`).
- Booking dates are `date`, times are `time`, all business days in
  `Asia/Manila` (`today()` from `scope.ts`).
- Settlement totals and operator shares come from `src/lib/pricing.ts`
  (`computeSettlementTotals`, `computeOperatorShare`). Do not reimplement.
- Ownership: operators only see their own cars/bookings; staff only their
  branch; admins see the branch selected in the topbar (or all).
- Payment proofs / booking photos live in private buckets — display them with
  `signedFileUrl` / `signedFileUrls` from `src/lib/storage.ts`. Car images use
  `carImageUrl` / `carImageUrls`. Remittance proofs use `signedFileUrl` with
  `remittancePhotoKey`.

---

## 7. Design tokens (legacy → Tailwind)

The shadcn theme in `src/app/globals.css` already encodes these. Use the token
classes, not raw hex values, except where the legacy page used a specific
accent:

| Legacy | Class |
| --- | --- |
| page background `#f8fafc` | `bg-background` |
| card `#fff`, radius 16px, border `#e2e8f0` | `bg-card`, `rounded-2xl`, `border-border` |
| primary yellow `#ffcc00` | `bg-primary`, `text-primary`, `text-[#b38a00]`, `bg-[#ffcc00]/12` |
| headings `#0f172a` | `text-foreground` |
| muted text `#64748b` | `text-muted-foreground` |
| table header `#f1f5f9`, uppercase 0.725rem | handled by `DataTable` |
| KPI value 1.5rem / 800 | `StatCard` |
| pill tabs active yellow/black | `PillTabs` |

Page spacing: `space-y-4` / `gap-4` between sections. Section padding:
`p-4 md:p-5`. Tables: `DataTable`.

Formatting:

- money → `Money` (or `formatPeso` from `@/lib/constants`)
- dates → `new Date(value).toLocaleDateString("en-PH", {...})` with
  `timeZone: "Asia/Manila"` when the value is a timestamp; `date` columns can
  be rendered as-is (`YYYY-MM-DD`) or via a small `formatDate` helper.
- nulls → `"—"`

---

## 8. Search, filters, pagination

Legacy pages used GET forms + DataTables. The port uses GET forms + query
params + server-side pagination:

```tsx
const params = await searchParams;
const page = readPage(params.page);
const perPage = readPerPage(params.perPage);
const { rows, count } = await listBookings(session, {
  status: searchParam(params, "status"),
  search: searchParam(params, "search"),
  page,
  perPage,
});
```

`searchParam(searchParams, key)` (from `@/lib/flash`) normalises
`string | string[] | undefined` to `string | undefined`.

Pagination footer:

```tsx
<DataTable
  …
  footer={
    <div className="flex items-center justify-between gap-3">
      <span>{count} record(s)</span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={buildHref({ page: page - 1 })}>Previous</Link> : null}
        {page * perPage < count ? <Link href={buildHref({ page: page + 1 })}>Next</Link> : null}
      </div>
    </div>
  }
/>
```

Build hrefs by copying the current params and overriding `page`.

---

## 9. Auth / roles per page

| Route | Roles |
| --- | --- |
| `/admin/**` | `admin` |
| `/staff/**` | `staff` (admin may preview? legacy did not) |
| `/operator/**` | `operator` |
| `/user/**` | `user` |
| `/shared/**` | any signed-in role (with per-role data scoping) |
| `/leave_review` | `user` |

`requireRole(...)` redirects unauthenticated visitors to `/login` and
wrong-role visitors to their own home.

---

## 10. Verification

```powershell
cd C:\instacar\next-instacar
npx tsc --noEmit
npx next build
```

Both must pass before a page is considered done. Common pitfalls:

- `useSearchParams` in a client component requires a `<Suspense>` boundary.
- Do not import server-only modules (`@/lib/auth`, `@/lib/supabase-admin`,
  `src/lib/data/*`) into a `"use client"` file.
- `searchParams` and `params` are Promises.
- Never nest `DashboardShell` inside a page.
