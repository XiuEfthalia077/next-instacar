"use server";

/**
 * Review server actions — the port of
 *   car-rental/pages/admin/process/reply_review.php
 *   car-rental/pages/admin/process/save_review.php
 *   car-rental/pages/user/process/submit_review.php
 *
 * NOTE: the Postgres enum is lowercase (`pending`, `approved`, `rejected`,
 * `replied`). The legacy PHP handlers wrote `'Pending'` / `'Replied'` into a
 * MySQL varchar column; the port keeps the same behaviour but uses the enum
 * values so inserts do not fail.
 */

import { revalidatePath } from "next/cache";

import { getSession, getSupabase, requireRole } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import { sendMail } from "@/lib/mailer";
import { siteUrl } from "@/lib/emails/booking";
import {
  BUCKETS,
  getExtension,
  publicFileUrl,
  uploadFile,
} from "@/lib/storage";

function str(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function int(form: FormData, key: string, fallback = 0): number {
  const parsed = Number.parseInt(str(form, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rating(form: FormData): number {
  const value = int(form, "rating", 5);
  return Math.min(5, Math.max(1, value));
}

/* ------------------------------------------------------------------ */
/* Admin reply                                                         */
/* ------------------------------------------------------------------ */

export async function replyReviewAction(formData: FormData) {
  await requireRole("admin");

  const reviewId = int(formData, "review_id");
  const reply = str(formData, "admin_reply");

  if (!reviewId) {
    flashRedirect("/admin/review_list", "error", "Invalid review ID.");
  }

  if (!reply) {
    flashRedirect("/admin/review_list", "error", "Reply cannot be empty.");
  }

  const supabase = await getSupabase();

  const { error } = await supabase
    .from("reviews")
    .update({ admin_reply: reply, status: "replied", updated_at: new Date().toISOString() })
    .eq("id", reviewId);

  if (error) {
    flashRedirect("/admin/review_list", "error", `Database error: ${error.message}`);
  }

  revalidatePath("/admin/review_list");
  revalidatePath("/");
  flashRedirect("/admin/review_list", "success", "Reply saved and published.");
}

/* ------------------------------------------------------------------ */
/* Customer review (leave_review page / booking details modal)         */
/* ------------------------------------------------------------------ */

export async function saveReviewAction(formData: FormData) {
  const session = await requireRole("user", "admin", "staff", "operator");

  const bookingId = int(formData, "booking_id");
  const title = str(formData, "review_title");
  const text = str(formData, "review_text");
  const stars = rating(formData);
  const returnUrl = str(formData, "return_url");

  const back = returnUrl || (bookingId ? `/leave_review?booking_id=${bookingId}` : "/user/mybookings");

  if (!bookingId || !title || !text) {
    flashRedirect(back, "error", "Please fill in all required fields.");
  }

  const supabase = await getSupabase();

  // The review always belongs to the booking's customer when the account is a
  // customer; staff/admin reviewing on behalf of a guest use the posted id.
  let userId = int(formData, "user_id");

  if (session.role === "user") {
    userId = session.userId;

    // A customer may only review their own completed booking.
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, user_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    const row = booking as { id: number; user_id: number | null; status: string | null } | null;

    if (!row || row.user_id !== session.userId) {
      flashRedirect("/user/mybookings", "error", "Booking not found.");
    }

    if (row.status !== "Completed") {
      flashRedirect(back, "error", "Reviews can only be submitted for completed bookings.");
    }
  }

  if (!userId) {
    flashRedirect(back, "error", "This booking has no customer account to review it.");
  }

  // Handle optional review photo upload
  const photo = formData.get("photo") ?? formData.get("image");
  let uploadedImageUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const ext = getExtension(photo.name) || "jpg";
    const fileName = `rev_${bookingId}_${Date.now()}.${ext}`;
    const uploadRes = await uploadFile(supabase, {
      bucket: BUCKETS.reviewPhotos,
      folder: `user_${userId}`,
      fileName,
      file: photo,
    });
    if (uploadRes.ok) {
      uploadedImageUrl = publicFileUrl(BUCKETS.reviewPhotos, uploadRes.path);
    }
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id, image_url")
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();

  const finalImageUrl = uploadedImageUrl || (existing as { image_url?: string | null } | null)?.image_url || null;

  if (existing) {
    const { error } = await supabase
      .from("reviews")
      .update({
        rating: stars,
        review_title: title,
        review_text: text,
        image_url: finalImageUrl,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId)
      .eq("user_id", userId);

    if (error) {
      flashRedirect(back, "error", `Database error: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from("reviews").insert({
      user_id: userId,
      booking_id: bookingId,
      rating: stars,
      review_title: title,
      review_text: text,
      image_url: finalImageUrl,
      status: "pending",
    });

    if (error) {
      flashRedirect(back, "error", `Database error: ${error.message}`);
    }
  }

  await sendMail({
    to: process.env.ADMIN_INBOX ?? process.env.SMTP_USER ?? "",
    subject: `New review submitted (booking #${bookingId})`,
    html: `<p><strong>${title}</strong></p><p>${text}</p><p>Rating: ${stars}/5</p><p><a href="${siteUrl("/admin/review_list")}">Open the review panel</a></p>`,
  }).catch(() => undefined);

  revalidatePath("/");
  revalidatePath("/admin/review_list");
  revalidatePath("/user/mybookings");

  flashRedirect(
    returnUrl || "/user/mybookings",
    "success",
    "Review submitted! It will appear once approved by an admin.",
  );
}

/* ------------------------------------------------------------------ */
/* Query user's completed bookings eligible for review                */
/* ------------------------------------------------------------------ */

export interface EligibleBooking {
  id: number;
  car_id: number | null;
  start_date: string | null;
  end_date: string | null;
  cars: {
    id: number;
    brand: string | null;
    model: string | null;
    type: string | null;
    image_path: string | null;
  } | null;
}

export async function getUserCompletedBookingsAction(): Promise<{
  isLoggedIn: boolean;
  completedBookings: EligibleBooking[];
}> {
  const session = await getSession();
  if (!session) {
    return { isLoggedIn: false, completedBookings: [] };
  }

  const supabase = await getSupabase();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id,
      car_id,
      start_date,
      end_date,
      cars!bookings_car_id_fkey ( id, brand, model, type, image_path )
    `)
    .eq("user_id", session.userId)
    .eq("status", "Completed")
    .order("end_date", { ascending: false });

  const rawRows = (data ?? []) as unknown as Array<{
    id: number;
    car_id: number | null;
    start_date: string | null;
    end_date: string | null;
    cars: {
      id: number;
      brand: string | null;
      model: string | null;
      type: string | null;
      image_path: string | null;
    } | {
      id: number;
      brand: string | null;
      model: string | null;
      type: string | null;
      image_path: string | null;
    }[] | null;
  }>;

  const completedBookings: EligibleBooking[] = rawRows.map((r) => ({
    id: r.id,
    car_id: r.car_id,
    start_date: r.start_date,
    end_date: r.end_date,
    cars: Array.isArray(r.cars) ? r.cars[0] ?? null : r.cars,
  }));

  return {
    isLoggedIn: true,
    completedBookings,
  };
}
