"use server";

/**
 * Booking server actions — the port of
 *   car-rental/pages/admin/process/booking_actions.php
 *   car-rental/pages/admin/process/save_payment.php
 *   car-rental/pages/admin/process/reset_settlement.php
 *   car-rental/pages/shared/handlers/update_booking.php
 *   car-rental/pages/shared/handlers/update_customer_info.php
 *   car-rental/pages/shared/handlers/delete_customer_item.php
 *   car-rental/pages/user/process/booking_process.php
 *
 * Business rules (unchanged from the PHP app):
 *
 *   Pending   -> Confirmed  only
 *   Confirmed -> Released   only   (car -> Active)
 *   Released  -> Completed  only   (car -> Available, extension fee)
 *   any       -> Cancelled         (total_price = 500, car -> Available)
 *
 *   Manual bookings are created directly as `Confirmed` / `manual`, hold the
 *   car (`Active`) and do NOT create a `booking_payments` row — that row is
 *   created at settlement time.
 */

import { revalidatePath } from "next/cache";

import { getSession, getSupabase, requireRole } from "@/lib/auth";
import { calculatePriceByHours } from "@/lib/pricing";
import {
  bookingConfirmedEmail,
  bookingCancelledEmail,
  siteUrl,
  tripCompletedEmail,
  vehicleReleasedEmail,
} from "@/lib/emails/booking";
import { flashRedirect } from "@/lib/flash";
import { manilaNowTimestamp, wallClockTimestamp } from "@/lib/datetime";
import { sendMail } from "@/lib/mailer";
import { BUCKETS, buildFileName, uploadFile, removeFile } from "@/lib/storage";
import { bookingPhotoKey } from "@/lib/storage";
import { insertBranchId } from "@/lib/data/scope";
import type { AppSession } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function str(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function int(form: FormData, key: string, fallback = 0): number {
  const parsed = Number.parseInt(str(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(form: FormData, key: string): number {
  const parsed = Number.parseFloat(str(form, key).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function file(form: FormData, key: string): File | null {
  const value = form.get(key);
  if (!(value instanceof File)) return null;
  if (!value.size) return null;
  return value;
}

/** Landing page of the booking listings, per role and source. */
function bookingsHome(session: AppSession, source: string): string {
  const manual = source === "manual";

  if (session.role === "staff") {
    return manual ? "/staff/bookings_manual" : "/staff/bookings";
  }

  return manual ? "/admin/bookings_manual" : "/admin/bookings_online";
}

function refreshBookingViews(bookingId: number) {
  revalidatePath("/admin/bookings_online");
  revalidatePath("/admin/bookings_manual");
  revalidatePath("/staff/bookings");
  revalidatePath("/staff/bookings_manual");
  revalidatePath("/staff/dashboard");
  revalidatePath("/admin/dashboard");
  revalidatePath("/shared/booking_details");
  revalidatePath(`/shared/booking_details/${bookingId}`);
  revalidatePath("/user/mybookings");
  revalidatePath("/user/dashboard");
}

type BookingRow = {
  id: number;
  car_id: number | null;
  user_id: number | null;
  guest_name: string | null;
  gmail: string | null;
  phone_number: string | null;
  branch_id: number | null;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  status: string;
  total_price: number | null;
  primary_id_path: string | null;
  secondary_id_path: string | null;
  proof_billing_path: string | null;
  proof_payment_path: string | null;
};

/**
 * Ensures staff users can only view or mutate bookings that belong to their assigned branch.
 * Admins have unrestricted global access.
 */
function assertBranchAccess(
  session: { role: string; branchId: number | null },
  bookingBranchId: number | null | undefined,
  backUrl: string,
) {
  if (session.role === "staff") {
    if (session.branchId && bookingBranchId && bookingBranchId !== session.branchId) {
      flashRedirect(backUrl, "error", "Unauthorized: Booking belongs to a different branch.");
    }
  }
}

/** Customer contact of a booking (registered customer first, guest second). */
async function bookingContact(bookingId: number) {
  const supabase = await getSupabase();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "guest_name, gmail, users!bookings_user_id_fkey ( name, email )",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { name: "", email: "" };

  const row = booking as {
    guest_name: string | null;
    gmail: string | null;
    users: { name: string | null; email: string | null } | { name: string | null; email: string | null }[] | null;
  };

  const user = Array.isArray(row.users) ? row.users[0] : row.users;

  return {
    name: user?.name ?? row.guest_name ?? "Customer",
    email: user?.email ?? row.gmail ?? "",
  };
}

async function notify(to: string, mail: { subject: string; html: string }) {
  if (!to) return;
  try {
    await sendMail({ to, subject: mail.subject, html: mail.html });
  } catch (error) {
    // E-mail delivery must never break the booking flow (legacy behaviour).
    console.error("[instacar] booking e-mail failed:", error);
  }
}

/**
 * Overlap check — the legacy SQL
 *
 *   requested_start < existing_end AND requested_end > existing_start
 *   AND status NOT IN ('Cancelled', 'Completed')
 */
async function hasOverlap(options: {
  carId: number;
  start: string;
  end: string;
  excludeBookingId?: number;
}): Promise<boolean> {
  const supabase = await getSupabase();

  const { data } = await supabase
    .from("bookings")
    .select("id, start_date, end_date, pickup_time, return_time")
    .eq("car_id", options.carId)
    .not("status", "in", "(Cancelled,Completed)");

  const requestedStart = wallClockTimestamp(options.start, "00:00:00");
  const requestedEnd = wallClockTimestamp(options.end, "23:59:59");

  for (const row of (data ?? []) as {
    id: number;
    start_date: string;
    end_date: string;
    pickup_time: string | null;
    return_time: string | null;
  }[]) {
    if (options.excludeBookingId && row.id === options.excludeBookingId) continue;

    const existingStart = wallClockTimestamp(
      row.start_date,
      row.pickup_time ?? "00:00:00",
    );
    const existingEnd = wallClockTimestamp(
      row.end_date,
      row.return_time ?? "23:59:59",
    );

    if (requestedStart < existingEnd && requestedEnd > existingStart) {
      return true;
    }
  }

  return false;
}

/** Car pricing columns used by the legacy calculator. */
type CarPricing = {
  id: number;
  branch_id: number | null;
  price_10_hours: number | null;
  price_12_hours: number | null;
  price_24_hours: number | null;
  ext_price_1_6: number | null;
  ext_price_7_10: number | null;
  ext_price_11_12: number | null;
  ext_price_13_24: number | null;
  operator_10_hours: number | null;
  operator_12_hours: number | null;
  operator_24_hours: number | null;
};

async function carPricing(carId: number): Promise<CarPricing | null> {
  const supabase = await getSupabase();

  const { data } = await supabase
    .from("cars")
    .select(
      "id, branch_id, price_10_hours, price_12_hours, price_24_hours, ext_price_1_6, ext_price_7_10, ext_price_11_12, ext_price_13_24, operator_10_hours, operator_12_hours, operator_24_hours",
    )
    .eq("id", carId)
    .maybeSingle();

  return (data as CarPricing | null) ?? null;
}

function priceFor(car: CarPricing, hours: number): number {
  return calculatePriceByHours(
    hours,
    Number(car.price_10_hours ?? 0),
    Number(car.price_12_hours ?? 0),
    Number(car.price_24_hours ?? 0),
    Number(car.ext_price_1_6 ?? 0),
    Number(car.ext_price_7_10 ?? 0),
    Number(car.ext_price_11_12 ?? 0),
    Number(car.ext_price_13_24 ?? 0),
  );
}

/** Normalises the posted fulfilment value to the enum (`Pickup`/`Delivery`). */
function fulfillmentValue(raw: string) {
  return raw.toLowerCase() === "delivery" ? "Delivery" : "Pickup";
}

/** Normalises `HH:MM` to `HH:MM:SS`. */
function timeValue(raw: string): string {
  if (!raw) return "00:00:00";
  return raw.length === 5 ? `${raw}:00` : raw;
}

/* ------------------------------------------------------------------ */
/* 1. Status machine                                                   */
/* ------------------------------------------------------------------ */

export async function updateBookingStatusAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const bookingId = int(formData, "id");
  const newStatus = str(formData, "status");
  const source = str(formData, "source", "online");
  const filter = str(formData, "filter", "All");

  const home = bookingsHome(session, source);
  const back = `${home}?filter=${encodeURIComponent(filter)}`;

  const valid = ["Pending", "Confirmed", "Released", "Completed", "Cancelled"];

  if (!bookingId || !valid.includes(newStatus)) {
    flashRedirect(back, "error", `Invalid status: ${newStatus}`);
  }

  const supabase = await getSupabase();

  const { data: current } = await supabase
    .from("bookings")
    .select(
      "id, car_id, status, start_date, end_date, pickup_time, return_time, total_price, user_id, guest_name, gmail, branch_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = current as BookingRow | null;

  if (!booking) {
    flashRedirect(back, "error", "Booking not found.");
  }

  assertBranchAccess(session, booking.branch_id, back);

  const oldStatus = booking.status;

  if (newStatus === "Confirmed" && oldStatus !== "Pending") {
    flashRedirect(back, "error", "Error: Can only Confirm a Pending booking.");
  }

  if (newStatus === "Released" && oldStatus !== "Confirmed") {
    flashRedirect(back, "error", "Error: Can only Release a Confirmed booking.");
  }

  if (newStatus === "Completed" && oldStatus !== "Released") {
    flashRedirect(back, "error", "Error: Can only Complete a Released booking.");
  }

  const now = new Date().toISOString();
  const actor = session.userId;

  /* ---------------- Released ---------------- */
  if (newStatus === "Released") {
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "Released",
        last_action_by: actor,
        last_action_at: now,
        last_action_type: "Released",
      })
      .eq("id", bookingId);

    if (error) flashRedirect(back, "error", `Failed to update booking: ${error.message}`);

    if (booking.car_id) {
      await supabase.from("cars").update({ status: "Active" }).eq("id", booking.car_id);
    }

    const contact = await bookingContact(bookingId);
    await notify(
      contact.email,
      vehicleReleasedEmail(contact.name, siteUrl("/user/dashboard")),
    );

    refreshBookingViews(bookingId);
    flashRedirect(back, "success", "Vehicle Released successfully.");
  }

  /* ---------------- Completed ---------------- */
  if (newStatus === "Completed") {
    const car = booking.car_id ? await carPricing(booking.car_id) : null;

    if (!car) {
      flashRedirect(back, "error", "Booking not found.");
    }

    const startStamp = wallClockTimestamp(
      booking.start_date,
      booking.pickup_time ?? "00:00:00",
    );
    const expectedEnd = wallClockTimestamp(
      booking.end_date,
      booking.return_time ?? "00:00:00",
    );
    const actualStamp = manilaNowTimestamp();

    const originalHours = (expectedEnd - startStamp) / 3_600_000;
    const actualHours = (actualStamp - startStamp) / 3_600_000;

    const extensionHours = Math.max(0, Math.ceil(actualHours - originalHours));

    if (extensionHours > 0) {
      const originalTotal = priceFor(car, originalHours);
      const newTotal = priceFor(car, actualHours);
      const additionalFee = newTotal - originalTotal;

      const { error } = await supabase
        .from("bookings")
        .update({
          status: "Completed",
          extension_hours: extensionHours,
          extension_price: additionalFee,
          total_price: newTotal,
          last_action_by: actor,
          last_action_at: now,
          last_action_type: "Completed",
        })
        .eq("id", bookingId);

      if (error) flashRedirect(back, "error", `Failed to update booking: ${error.message}`);

      if (booking.car_id) {
        await supabase.from("cars").update({ status: "Available" }).eq("id", booking.car_id);
      }

      refreshBookingViews(bookingId);
      flashRedirect(
        back,
        "warning",
        [
          "EXTENSION / LATE RETURN DETECTED!",
          "--------------------------------------",
          `Original Booking: ${originalHours.toFixed(1)} hours`,
          `Actual Duration: ${actualHours.toFixed(1)} hours`,
          `Extension: +${extensionHours} hour(s)`,
          `Original Total: ${originalTotal.toFixed(2)}`,
          `Additional Fee: ${additionalFee.toFixed(2)}`,
          `NEW TOTAL: ${newTotal.toFixed(2)}`,
        ].join("\n"),
      );
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        status: "Completed",
        last_action_by: actor,
        last_action_at: now,
        last_action_type: "Completed",
      })
      .eq("id", bookingId);

    if (error) flashRedirect(back, "error", `Failed to update booking: ${error.message}`);

    if (booking.car_id) {
      await supabase.from("cars").update({ status: "Available" }).eq("id", booking.car_id);
    }

    const contact = await bookingContact(bookingId);
    await notify(
      contact.email,
      tripCompletedEmail(contact.name, siteUrl(`/leave_review?booking_id=${bookingId}`)),
    );

    refreshBookingViews(bookingId);
    flashRedirect(
      back,
      "success",
      `Booking completed! Review email sent to ${contact.email || "the customer"}.`,
    );
  }

  /* ---------------- Confirmed ---------------- */
  if (newStatus === "Confirmed") {
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "Confirmed",
        last_action_by: actor,
        last_action_at: now,
        last_action_type: "Confirmed",
      })
      .eq("id", bookingId);

    if (error) flashRedirect(back, "error", `Failed to update booking: ${error.message}`);

    if (booking.car_id) {
      await supabase.from("cars").update({ status: "Active" }).eq("id", booking.car_id);
    }

    const contact = await bookingContact(bookingId);
    await notify(contact.email, bookingConfirmedEmail(contact.name, siteUrl("/user/dashboard")));

    refreshBookingViews(bookingId);
    flashRedirect(back, "success", `Booking confirmed! Notification sent to ${contact.email || "the customer"}.`);
  }

  /* ---------------- Cancelled ---------------- */
  if (newStatus === "Cancelled") {
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "Cancelled",
        total_price: 500,
        last_action_by: actor,
        last_action_at: now,
        last_action_type: "Cancelled",
      })
      .eq("id", bookingId);

    if (error) flashRedirect(back, "error", `Failed to update booking: ${error.message}`);

    if (booking.car_id) {
      await supabase.from("cars").update({ status: "Available" }).eq("id", booking.car_id);
    }

    const contact = await bookingContact(bookingId);
    await notify(contact.email, bookingCancelledEmail(contact.name, siteUrl("/user/dashboard")));

    refreshBookingViews(bookingId);
    flashRedirect(back, "success", "Booking cancelled and email sent.");
  }

  refreshBookingViews(bookingId);
  flashRedirect(back, "success", `Booking status updated to ${newStatus}.`);
}

/* ------------------------------------------------------------------ */
/* 2. Manual booking (walk-in)                                         */
/* ------------------------------------------------------------------ */

export async function addManualBookingAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const carId = int(formData, "car_id");
  const startDate = str(formData, "start_date");
  const endDate = str(formData, "end_date");
  const pickupTime = timeValue(str(formData, "pickup_time"));
  const returnTime = timeValue(str(formData, "return_time"));

  const home =
    session.role === "staff" ? "/staff/bookings_manual" : "/admin/bookings_manual";

  if (!carId || !startDate || !endDate) {
    flashRedirect(home, "error", "Please fill in all required fields.");
  }

  const overlap = await hasOverlap({
    carId,
    start: startDate,
    end: endDate,
  });

  if (overlap) {
    flashRedirect(
      home,
      "error",
      "This vehicle is already booked or unavailable during your selected time slot.",
    );
  }

  const car = await carPricing(carId);

  if (!car) {
    flashRedirect(home, "error", "Vehicle not found.");
  }

  const startStamp = wallClockTimestamp(startDate, pickupTime);
  const endStamp = wallClockTimestamp(endDate, returnTime);
  const hours = (endStamp - startStamp) / 3_600_000;

  if (hours <= 0) {
    flashRedirect(home, "error", "Return date/time must be after pickup date/time!");
  }

  const totalPrice = priceFor(car, hours);

  const userId = int(formData, "user_id");
  const guestName = str(formData, "guest_name");
  const guestEmail = str(formData, "guest_email");
  const guestPhone = str(formData, "guest_phone");

  const branchId =
    session.role === "staff"
      ? session.branchId || insertBranchId(session)
      : int(formData, "branch_id") || insertBranchId(session);
  const supabase = await getSupabase();

  let folder: string;
  if (userId) {
    folder = `user_${userId}_${Math.floor(Date.now() / 1000)}`;
  } else {
    const identifier = (guestName || guestEmail || `guest_${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    folder = `${identifier}_${Math.floor(Date.now() / 1000)}`;
  }

  const uploads: { primary: string; secondary: string; billing: string } = {
    primary: "",
    secondary: "",
    billing: "",
  };

  for (const [field, prefix, key] of [
    ["primary_id", "primary", "primary"],
    ["secondary_id", "secondary", "secondary"],
    ["proof_of_billing", "billing", "billing"],
  ] as const) {
    const upload = file(formData, field);
    if (!upload) continue;

    const fileName = buildFileName(prefix, upload);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.bookingUploads,
      folder,
      fileName,
      file: upload,
    });

    if (result.ok) uploads[key] = `${folder}/${fileName}`;
  }

  const rawFulfillment = str(formData, "fulfillment_type");
  const fulfillmentType: "Pickup" | "Delivery" =
    rawFulfillment.toLowerCase() === "delivery" ? "Delivery" : "Pickup";
  const deliveryAddress = str(formData, "delivery_address") || null;

  const { data: inserted, error } = await supabase
    .from("bookings")
    .insert({
      user_id: userId || null,
      created_by: session.userId,
      last_action_by: session.userId,
      last_action_at: new Date().toISOString(),
      last_action_type: "Confirmed",
      branch_id: branchId,
      guest_name: guestName || null,
      gmail: guestEmail || null,
      phone_number: guestPhone || null,
      primary_id_path: uploads.primary || null,
      secondary_id_path: uploads.secondary || null,
      proof_billing_path: uploads.billing || null,
      car_id: carId,
      start_date: startDate,
      end_date: endDate,
      pickup_time: pickupTime,
      return_time: returnTime,
      total_price: totalPrice,
      discount_price: money(formData, "discount_price"),
      down_payment: money(formData, "down_payment"),
      delivery_fee: money(formData, "delivery_fee"),
      pickup_fee: money(formData, "pickup_fee"),
      fulfillment_type: fulfillmentType,
      delivery_address: deliveryAddress,
      remarks: str(formData, "remarks") || null,
      status: "Confirmed",
      booking_type: "manual",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    flashRedirect(home, "error", `Database error: ${error.message}`);
  }

  await supabase.from("cars").update({ status: "Active" }).eq("id", carId);

  revalidatePath("/admin/bookings_manual");
  revalidatePath("/staff/bookings_manual");
  revalidatePath("/shared/calendar");
  revalidatePath("/shared/cars");

  const bookingId = (inserted as { id: number } | null)?.id ?? 0;
  if (bookingId) refreshBookingViews(bookingId);

  flashRedirect(
    home,
    "success",
    `Walk-in booking confirmed successfully. Total: ${totalPrice.toFixed(2)}`,
  );
}

/* ------------------------------------------------------------------ */
/* 3. Full booking edit (admin)                                        */
/* ------------------------------------------------------------------ */

export async function updateBookingAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const bookingId = int(formData, "booking_id");
  const source = str(formData, "source", "online");
  const home = bookingsHome(session, source);

  if (!bookingId) flashRedirect(home, "error", "Invalid booking.");

  const carId = int(formData, "car_id");
  const pickupRaw = str(formData, "pickup_datetime");
  const returnRaw = str(formData, "return_datetime");

  const pickup = new Date(pickupRaw.replace(" ", "T"));
  const ret = new Date(returnRaw.replace(" ", "T"));

  if (!Number.isFinite(pickup.getTime()) || !Number.isFinite(ret.getTime()) || ret <= pickup) {
    flashRedirect(home, "error", "Return date/time must be after pickup date/time!");
  }

  const startDate = pickupRaw.slice(0, 10);
  const endDate = returnRaw.slice(0, 10);
  const pickupTime = timeValue(pickupRaw.slice(11, 16));
  const returnTime = timeValue(returnRaw.slice(11, 16));

  const overlap = await hasOverlap({
    carId,
    start: startDate,
    end: endDate,
    excludeBookingId: bookingId,
  });

  if (overlap) {
    flashRedirect(
      home,
      "error",
      "This vehicle is already booked or unavailable during your selected time slot.",
    );
  }

  const supabase = await getSupabase();

  const { data: oldData } = await supabase
    .from("bookings")
    .select(
      "id, car_id, user_id, guest_name, gmail, primary_id_path, secondary_id_path, proof_billing_path, branch_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const old = oldData as BookingRow | null;

  if (!old) flashRedirect(home, "error", "Booking tracking log missing!");

  assertBranchAccess(session, old.branch_id, home);

  const car = await carPricing(carId);
  if (!car) flashRedirect(home, "error", "Vehicle not found.");

  const hours = (ret.getTime() - pickup.getTime()) / 3_600_000;
  const totalPrice = priceFor(car, hours);

  const customerType = str(formData, "customer_type", "registered");
  const userId = customerType === "registered" ? int(formData, "user_id") : 0;

  const folder =
    (old.primary_id_path ?? old.secondary_id_path ?? old.proof_billing_path ?? "").split(
      "/",
    )[0] || `edit_customer_${bookingId}_${Math.floor(Date.now() / 1000)}`;

  const paths = {
    primary: old.primary_id_path ?? "",
    secondary: old.secondary_id_path ?? "",
    billing: old.proof_billing_path ?? "",
  };

  for (const [field, prefix, key] of [
    ["primary_id", "primary", "primary"],
    ["secondary_id", "secondary", "secondary"],
    ["proof_of_billing", "billing", "billing"],
  ] as const) {
    const upload = file(formData, field);
    if (!upload) continue;

    const fileName = buildFileName(prefix, upload);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.bookingUploads,
      folder,
      fileName,
      file: upload,
    });

    if (result.ok) paths[key] = `${folder}/${fileName}`;
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      user_id: userId || null,
      guest_name: customerType === "registered" ? null : str(formData, "guest_name") || null,
      gmail: customerType === "registered" ? null : str(formData, "guest_email") || null,
      phone_number: customerType === "registered" ? null : str(formData, "guest_phone") || null,
      primary_id_path: paths.primary || null,
      secondary_id_path: paths.secondary || null,
      proof_billing_path: paths.billing || null,
      car_id: carId,
      start_date: startDate,
      end_date: endDate,
      pickup_time: pickupTime,
      return_time: returnTime,
      discount_price: money(formData, "discount_price"),
      down_payment: money(formData, "down_payment"),
      delivery_fee: money(formData, "delivery_fee"),
      pickup_fee: money(formData, "pickup_fee"),
      remarks: str(formData, "remarks") || null,
      total_price: totalPrice,
      last_action_by: session.userId,
      last_action_at: new Date().toISOString(),
      last_action_type: "Edited",
    })
    .eq("id", bookingId);

  if (error) flashRedirect(home, "error", `Failed to update booking: ${error.message}`);

  if (old.car_id && old.car_id !== carId) {
    await supabase.from("cars").update({ status: "Available" }).eq("id", old.car_id);
    await supabase.from("cars").update({ status: "Active" }).eq("id", carId);
  }

  refreshBookingViews(bookingId);
  flashRedirect(home, "success", `Booking updated successfully! New total: ${totalPrice.toFixed(2)}`);
}

/* ------------------------------------------------------------------ */
/* 4. Reservation edit (credentials modal)                             */
/* ------------------------------------------------------------------ */

export async function updateReservationAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const bookingId = int(formData, "booking_id");
  const source = str(formData, "source", "online");
  const home = bookingsHome(session, source);

  if (!bookingId) flashRedirect(home, "error", "Invalid booking.");

  const supabase = await getSupabase();

  const { data: oldData } = await supabase
    .from("bookings")
    .select(
      "id, car_id, primary_id_path, secondary_id_path, proof_billing_path, proof_payment_path, branch_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const old = oldData as BookingRow | null;
  if (!old) flashRedirect(home, "error", "Booking record not found.");

  assertBranchAccess(session, old.branch_id, home);

  const startDate = str(formData, "start_date");
  const endDate = str(formData, "end_date");
  const pickupTime = timeValue(str(formData, "pickup_time"));
  const returnTime = timeValue(str(formData, "return_time"));

  if (!startDate || !endDate) flashRedirect(home, "error", "Invalid dates.");

  const overlap = await hasOverlap({
    carId: old.car_id ?? 0,
    start: startDate,
    end: endDate,
    excludeBookingId: bookingId,
  });

  if (overlap) {
    flashRedirect(
      home,
      "error",
      "This vehicle is already booked or unavailable during selected dates.",
    );
  }

  const fulfillment = fulfillmentValue(str(formData, "fulfillment_type", "pickup"));

  const folder =
    (old.primary_id_path ?? old.secondary_id_path ?? old.proof_billing_path ?? "").split(
      "/",
    )[0] || `booking_${bookingId}_${Math.floor(Date.now() / 1000)}`;

  const paths = {
    primary: old.primary_id_path ?? "",
    secondary: old.secondary_id_path ?? "",
    billing: old.proof_billing_path ?? "",
    payment: old.proof_payment_path ?? "",
  };

  for (const [field, prefix, key] of [
    ["primary_id", "primary", "primary"],
    ["secondary_id", "secondary", "secondary"],
    ["proof_of_billing", "billing", "billing"],
    ["proof_of_payment", "payment", "payment"],
  ] as const) {
    const upload = file(formData, field);
    if (!upload) continue;

    const fileName = buildFileName(prefix, upload);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.bookingUploads,
      folder,
      fileName,
      file: upload,
    });

    if (result.ok) paths[key] = `${folder}/${fileName}`;
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      fulfillment_type: fulfillment,
      delivery_address: str(formData, "delivery_address") || null,
      start_date: startDate,
      end_date: endDate,
      pickup_time: pickupTime,
      return_time: returnTime,
      total_price: money(formData, "total_price"),
      down_payment: money(formData, "down_payment"),
      primary_id_path: paths.primary || null,
      secondary_id_path: paths.secondary || null,
      proof_billing_path: paths.billing || null,
      proof_payment_path: paths.payment || null,
      last_action_by: session.userId,
      last_action_at: new Date().toISOString(),
      last_action_type: "Edited",
    })
    .eq("id", bookingId);

  if (error) flashRedirect(home, "error", `Failed to update reservation: ${error.message}`);

  refreshBookingViews(bookingId);
  flashRedirect(home, "success", "Reservation details updated successfully!");
}

/* ------------------------------------------------------------------ */
/* 5. Settlement                                                       */
/* ------------------------------------------------------------------ */

export async function savePaymentAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const bookingId = int(formData, "booking_id");
  const home =
    session.role === "staff" ? "/staff/staff_settlements" : "/admin/settlements";

  if (!bookingId) flashRedirect(home, "error", "Invalid booking.");

  const rent = money(formData, "daily_rent");
  const wash = money(formData, "carwash");
  const ext = money(formData, "extension_fee");
  const delivery = money(formData, "delivery_fee");
  const jerDelivery = money(formData, "jer_delivery_fee");
  const pickup = money(formData, "pickup_fee");
  const jerPickup = money(formData, "jer_pickup_fee");
  const fuel = money(formData, "fuel");
  const driver = money(formData, "driver_fee");
  const damage = money(formData, "damage_fee");
  const agent = money(formData, "agent_fee");
  const others = money(formData, "others");

  const totalGross =
    rent + ext + delivery + pickup + damage + others + wash + fuel + driver;
  const totalNet = totalGross - jerDelivery - jerPickup - agent;

  const supabase = await getSupabase();

  const { data: bookingData } = await supabase
    .from("bookings")
    .select(
      `
      id, car_id, branch_id, start_date, end_date, pickup_time, return_time,
      cars!bookings_car_id_fkey (
        id, user_id,
        operator_10_hours, operator_12_hours, operator_24_hours,
        users!cars_user_id_fkey ( role )
      )
    `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingData as
    | {
        id: number;
        car_id: number | null;
        branch_id: number | null;
        start_date: string;
        end_date: string;
        pickup_time: string | null;
        return_time: string | null;
        cars: {
          id: number;
          user_id: number | null;
          operator_10_hours: number | null;
          operator_12_hours: number | null;
          operator_24_hours: number | null;
          users: { role: string } | { role: string }[] | null;
        } | null;
      }
    | null;

  if (!booking) flashRedirect(home, "error", "Booking not found.");

  assertBranchAccess(session, booking.branch_id, home);

  let operatorShare = 0;
  const car = booking.cars;
  const owner = Array.isArray(car?.users) ? car?.users[0] : car?.users;

  if (car && owner?.role === "operator") {
    const startTs = wallClockTimestamp(
      booking.start_date,
      booking.pickup_time ?? "00:00:00",
    );
    const endTs = wallClockTimestamp(
      booking.end_date,
      booking.return_time ?? "00:00:00",
    );

    if (endTs > startTs) {
      const hours = Math.ceil((endTs - startTs) / 3_600_000);

      const op10 = Number(car.operator_10_hours ?? 0);
      const op12 = Number(car.operator_12_hours ?? 0);
      const op24 = Number(car.operator_24_hours ?? 0);

      if (hours <= 10 && op10 > 0) operatorShare = op10;
      else if (hours <= 12 && op12 > 0) operatorShare = op12;
      else if (hours <= 24 && op24 > 0) operatorShare = op24;
      else if (op24 > 0) operatorShare = Math.floor(hours / 24) * op24;
    }
  }

  operatorShare = Math.round(operatorShare * 100) / 100;

  // Re-settlement: the legacy handler deletes the previous row first.
  await supabase.from("booking_payments").delete().eq("booking_id", bookingId);

  const { error } = await supabase.from("booking_payments").insert({
    booking_id: bookingId,
    daily_rent: rent,
    carwash: wash,
    extension_fee: ext,
    delivery_fee: delivery,
    jer_delivery_fee: jerDelivery,
    pickup_fee: pickup,
    jer_pickup_fee: jerPickup,
    fuel,
    driver_fee: driver,
    damage_fee: damage,
    agent_fee: agent,
    others,
    total_gross: totalGross,
    total_net: totalNet,
    operator_share: operatorShare,
    remarks: str(formData, "remarks") || null,
    settled_by: session.userId,
    settled_at: new Date().toISOString(),
  });

  if (error) flashRedirect(home, "error", `Insert failed: ${error.message}`);

  let message = `Payment recorded successfully! Gross: ${totalGross.toFixed(2)} | Net: ${totalNet.toFixed(2)}`;
  if (operatorShare > 0) {
    message += ` | Operator owed: ${operatorShare.toFixed(2)}`;
  }

  revalidatePath("/admin/settlements");
  revalidatePath("/staff/staff_settlements");
  revalidatePath("/admin/income");
  revalidatePath("/admin/admin_revenue");
  revalidatePath("/staff/staff_gross");
  revalidatePath("/admin/operator_revenue");
  revalidatePath("/admin/remittance");

  flashRedirect(home, "success", message);
}

export async function resetSettlementAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const bookingId = int(formData, "booking_id");
  const home =
    session.role === "staff" ? "/staff/staff_settlements" : "/admin/settlements";

  if (!bookingId) flashRedirect(home, "error", "Invalid booking ID.");

  const supabase = await getSupabase();

  if (session.role === "staff") {
    // Staff may only reset settlements inside their own branch.
    const { data } = await supabase
      .from("bookings")
      .select("id, branch_id")
      .eq("id", bookingId)
      .maybeSingle();

    const row = data as { id: number; branch_id: number | null } | null;

    if (!row || row.branch_id !== session.branchId) {
      flashRedirect(home, "error", "Booking not found or access denied.");
    }
  }

  const { error } = await supabase
    .from("booking_payments")
    .delete()
    .eq("booking_id", bookingId);

  if (error) flashRedirect(home, "error", `Reset failed: ${error.message}`);

  revalidatePath("/admin/settlements");
  revalidatePath("/staff/staff_settlements");

  flashRedirect(home, "success", "Settlement reset successfully. The booking is pending settlement again.");
}

/* ------------------------------------------------------------------ */
/* 6. Customer remarks / photos                                        */
/* ------------------------------------------------------------------ */

async function assertBookingAccess(bookingId: number) {
  const session = await getSession();
  if (!session) return false;

  const supabase = await getSupabase();
  const { data } = await supabase.rpc("user_can_access_booking", {
    p_booking_id: bookingId,
  });

  return data === true;
}

export async function addCustomerInfoAction(formData: FormData) {
  const session = await requireRole("admin", "staff", "operator");

  const bookingId = int(formData, "booking_id");
  const back = `/shared/booking_details?id=${bookingId}`;

  if (!bookingId || !(await assertBookingAccess(bookingId))) {
    flashRedirect("/shared/booking_details", "error", "Booking not found or access denied.");
  }

  const supabase = await getSupabase();
  const remark = str(formData, "new_remark");

  if (remark) {
    await supabase.from("booking_remarks").insert({
      booking_id: bookingId,
      created_by: session.userId,
      remark,
    });
  }

  const photos = formData.getAll("customer_photos").filter(
    (value): value is File => value instanceof File && value.size > 0,
  );

  for (const photo of photos) {
    const fileName = buildFileName(`customer_${bookingId}`, photo);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.bookingPhotos,
      fileName,
      file: photo,
    });

    if (result.ok) {
      await supabase.from("booking_photos").insert({
        booking_id: bookingId,
        file_name: fileName,
      });
    }
  }

  revalidatePath("/shared/booking_details");
  flashRedirect(back, "success", "Customer information saved.");
}

export async function deleteBookingItemAction(formData: FormData) {
  await requireRole("admin", "staff", "operator");

  const bookingId = int(formData, "booking_id");
  const type = str(formData, "type");
  const back = `/shared/booking_details?id=${bookingId}`;

  if (!bookingId || !(await assertBookingAccess(bookingId))) {
    flashRedirect("/shared/booking_details", "error", "Booking not found or access denied.");
  }

  const supabase = await getSupabase();

  if (type === "photo") {
    const photoId = int(formData, "photo_id");
    const fileName = str(formData, "file_name");

    await supabase
      .from("booking_photos")
      .delete()
      .eq("id", photoId)
      .eq("booking_id", bookingId);

    if (fileName) {
      await removeFile(supabase, BUCKETS.bookingPhotos, bookingPhotoKey(fileName));
    }
  }

  if (type === "remark") {
    const remarkId = int(formData, "remark_id");
    await supabase
      .from("booking_remarks")
      .delete()
      .eq("id", remarkId)
      .eq("booking_id", bookingId);
  }

  revalidatePath("/shared/booking_details");
  flashRedirect(back, "success", "Item deleted.");
}

/* ------------------------------------------------------------------ */
/* 6b. Pay remaining balance (staff / admin)                           */
/* ------------------------------------------------------------------ */

export async function payRemainingBalanceAction(formData: FormData) {
  const session = await requireRole("admin", "staff");

  const bookingId = int(formData, "booking_id");
  const back = `/shared/booking_details?id=${bookingId}`;

  if (!bookingId) {
    flashRedirect("/shared/calendar", "error", "Invalid booking.");
  }

  const supabase = await getSupabase();
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("id, branch_id, total_price, down_payment, proof_payment_path")
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingData as {
    id: number;
    branch_id: number | null;
    total_price: number | null;
    down_payment: number | null;
    proof_payment_path: string | null;
  } | null;

  if (!booking) {
    flashRedirect(back, "error", "Booking not found.");
  }

  assertBranchAccess(session, booking.branch_id, back);

  const amount = money(formData, "amount");
  const method = str(formData, "payment_method", "Cash");
  const reference = str(formData, "reference_number");
  const notes = str(formData, "notes");

  if (amount <= 0) {
    flashRedirect(back, "error", "Payment amount must be greater than zero.");
  }

  const currentBal = Number(booking.total_price ?? 0);
  const currentPaid = Number(booking.down_payment ?? 0);

  const newBalance = Math.max(0, currentBal - amount);
  const newDownPayment = currentPaid + amount;

  // Handle optional receipt upload
  const receiptFile = file(formData, "receipt_photo");
  let newReceiptPath = booking.proof_payment_path;

  if (receiptFile) {
    const fileName = buildFileName(`payment_bal_${bookingId}`, receiptFile);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.bookingUploads,
      folder: `booking_${bookingId}`,
      fileName,
      file: receiptFile,
    });
    if (result.ok) {
      newReceiptPath = `booking_${bookingId}/${fileName}`;
    }
  }

  // Update booking balance
  const { error } = await supabase
    .from("bookings")
    .update({
      total_price: newBalance,
      down_payment: newDownPayment,
      proof_payment_path: newReceiptPath,
      last_action_by: session.userId,
      last_action_at: new Date().toISOString(),
      last_action_type: "Payment Recorded",
    })
    .eq("id", bookingId);

  if (error) {
    flashRedirect(back, "error", `Payment update failed: ${error.message}`);
  }

  // Insert remark log
  const refText = reference ? ` (Ref: ${reference})` : "";
  const notesText = notes ? ` — Notes: ${notes}` : "";
  const remarkText = `Payment received: ₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} via ${method}${refText}${notesText}. Remaining balance: ₱${newBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;

  await supabase.from("booking_remarks").insert({
    booking_id: bookingId,
    created_by: session.userId,
    remark: remarkText,
  });

  refreshBookingViews(bookingId);
  flashRedirect(
    back,
    "success",
    `Payment of ₱${amount.toFixed(2)} recorded successfully! Remaining balance: ₱${newBalance.toFixed(2)}.`,
  );
}

/* ------------------------------------------------------------------ */
/* 7. Online booking (customer)                                        */
/* ------------------------------------------------------------------ */

export async function createBookingAction(formData: FormData) {
  const session = await requireRole("user");

  const carId = int(formData, "car_id");
  const startDate = str(formData, "start_date");
  const endDate = str(formData, "end_date");
  const pickupTime = timeValue(str(formData, "pickup_time"));
  const returnTime = timeValue(str(formData, "return_time"));

  const back = carId ? `/user/cars?car=${carId}` : "/user/cars";

  if (!carId || !startDate || !endDate) {
    flashRedirect(back, "error", "Invalid request.");
  }

  const hours =
    (wallClockTimestamp(endDate, returnTime) -
      wallClockTimestamp(startDate, pickupTime)) /
    3_600_000;

  if (hours < 10) {
    flashRedirect(
      back,
      "error",
      `Minimum booking duration is 10 hours. Your booking is only ${hours.toFixed(1)} hour(s).`,
    );
  }

  const car = await carPricing(carId);
  if (!car) flashRedirect(back, "error", "Vehicle not found.");

  const overlap = await hasOverlap({ carId, start: startDate, end: endDate });
  if (overlap) {
    flashRedirect(
      back,
      "error",
      "This vehicle is already booked or unavailable during your selected time slot.",
    );
  }

  const totalPrice = priceFor(car, hours);

  const supabase = await getSupabase();

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", session.userId)
    .maybeSingle();

  const folderName = ((profile as { name: string | null } | null)?.name ?? `user_${session.userId}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const folder = `${folderName}_${session.userId}`;

  const upload = async (field: string, prefix: string) => {
    const fileValue = file(formData, field);
    if (!fileValue) return "";

    const fileName = buildFileName(prefix, fileValue);
    const result = await uploadFile(supabase, {
      bucket: BUCKETS.bookingUploads,
      folder,
      fileName,
      file: fileValue,
    });

    return result.ok ? `${folder}/${fileName}` : "";
  };

  const primaryId = await upload("primary_id", "primary");

  if (!primaryId) {
    flashRedirect(back, "error", "Primary ID is required (JPG, PNG, or PDF only, max 5MB).");
  }

  const secondaryId = await upload("secondary_id", "secondary");
  const proofBilling = await upload("proof_of_billing", "billing");
  const proofPayment = await upload("proof_of_payment", "payment");

  const fulfillment = fulfillmentValue(str(formData, "fulfillment_type", "pickup"));

  const { error } = await supabase.from("bookings").insert({
    user_id: session.userId,
    created_by: session.userId,
    car_id: carId,
    branch_id: car.branch_id,
    start_date: startDate,
    end_date: endDate,
    pickup_time: pickupTime,
    return_time: returnTime,
    total_price: totalPrice,
    discount_price: 0,
    down_payment: 0,
    status: "Pending",
    booking_type: "online",
    fulfillment_type: fulfillment,
    delivery_address:
      fulfillment === "Delivery" ? str(formData, "delivery_address") || null : null,
    return_delivery_address: str(formData, "return_delivery_address") || null,
    primary_id_path: primaryId,
    secondary_id_path: secondaryId || null,
    proof_billing_path: proofBilling || null,
    proof_payment_path: proofPayment || null,
  });

  if (error) flashRedirect(back, "error", `Database Error: ${error.message}`);

  revalidatePath("/user/mybookings");
  revalidatePath("/user/dashboard");
  revalidatePath("/admin/bookings_online");
  revalidatePath("/staff/bookings");
  revalidatePath("/shared/calendar");

  flashRedirect(
    "/user/mybookings",
    "success",
    `Booking submitted successfully! Duration: ${hours.toFixed(1)} hours. Total: ${totalPrice.toFixed(2)}`,
  );
}
