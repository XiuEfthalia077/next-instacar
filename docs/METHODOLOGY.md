# InstaCar Operational Methodology

This file describes the working rules for the car-rental product during the PHP-to-Next.js + Supabase migration. The current legacy app is the source of truth, and the actual SQL schema in `car-rental/if0_42471936_car_rental.sql` defines the real behavior.

## Core booking method

A booking is considered valid only when all of the following are true:

1. The selected car exists and belongs to the relevant branch context.
2. The rental dates do not overlap any already-booked period for that car.
3. The requested rental duration is accepted for the vehicle pricing rules.
4. The user and booking context are valid for the current flow.
5. Payment proof, ID image paths, fees, and remarks are stored on the right booking record.

## Availability logic

Availability is a date/time overlap check. The system must reject bookings that conflict with existing bookings for the same car.

```text
requested_start <= existing_end
AND requested_end >= existing_start
```

This is the same logic implied by the actual booking data and schedule management in the PHP app.

## Car schedule logic

The project has a `car_schedules` table for vehicle unavailability. These schedules represent things like:

- maintenance
- personal use
- unavailable periods
- other operational blocks

A car should be treated as unavailable when it has a relevant schedule segment overlapping the requested period.

## Pricing and fees

The app stores pricing details in both the `cars` and `booking_payments` tables.

### Car pricing fields

- `price_24_hours`
- `price_10_hours`
- `price_12_hours`
- `operator_24_hours`
- `ext_price_1_6`
- `ext_price_7_10`
- `ext_price_11_12`
- `ext_price_13_24`

### Payment detail fields

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
- `operator_share`
- `remitted_amount`
- `owner_balance`

The new app must preserve the same fee structure and settlement flow.

## Booking status flow

The actual app uses the following booking `status` values:

| Status | Meaning |
|---|---|
| `Pending` | Booking is waiting on approval or review |
| `Confirmed` | Booking is accepted |
| `Released` | Car has been released to the customer |
| `Completed` | Rental has ended successfully |
| `Cancelled` | Booking was cancelled |

The migration must not replace these values with a different state system.

## Booking type and fulfillment type

The real app uses:

- `booking_type`: `online` or `manual`
- `fulfillment_type`: `Pickup` or `Delivery`

Any migrated flow must preserve those values and corresponding UI behavior.

## Staff and operator logic

The app clearly distinguishes:

- customer user accounts
- staff accounts
- operator accounts
- admin accounts

The `users.role` and `branch_id` fields control access. The new app must preserve this role/branch model in Supabase Auth and RLS.

## Payment and settlement flow

The financial workflow in the current system includes:

- booking payment records
- remittance records for operators
- staff fee remittances
- photo proof attachments
- settled and unsettled amounts

These must remain tied to the booking and branch context. The migration should keep this connection intact.

## Review and content flow

The current app stores:

- customer reviews in `reviews`
- admin replies in `admin_reply`
- contract and content values in `site_content`
- contact messages in `contact_messages`

The new app should keep these flows and data relationships intact.

## Acceptance criteria for migration work

A migrated feature is correct only if all of these still hold:

- same booking status values
- same role and branch scope logic
- same overlap prevention rules
- same fee structure and settlement behavior
- same booking proof, remarks, and photo data rules
- same design intent and page flow from the original app

Do not rewrite the app into a different concept. The new app must reproduce the real InstaCar system accurately.
