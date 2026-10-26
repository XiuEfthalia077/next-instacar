"use server";

/**
 * Profile server actions — the port of
 *   car-rental/pages/shared/handlers/profile_actions.php
 *
 * Password handling note
 * ----------------------
 * The legacy app verified the current password with `password_verify()` and
 * stored a new `password_hash()` value. GoTrue owns verification in the new
 * app, so the current password is checked with a real sign-in and the new
 * password is written through `auth.updateUser()`. The database trigger then
 * mirrors the new bcrypt hash into `public.users.password`, keeping the legacy
 * column canonical.
 */

import { revalidatePath } from "next/cache";

import { getSupabase, requireRole, requireSession } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import { BUCKETS, uploadFile } from "@/lib/storage";

const PROFILE_PATH = "/shared/profile";

function str(form: FormData, key: string, fallback = ""): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function file(form: FormData, key: string): File | null {
  const value = form.get(key);
  if (!(value instanceof File) || !value.size) return null;
  return value;
}

/* ------------------------------------------------------------------ */
/* Personal info                                                       */
/* ------------------------------------------------------------------ */

export async function updateProfileInfoAction(formData: FormData) {
  const session = await requireSession();

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone") || str(formData, "phone_number");
  const returnTo = str(formData, "return_to") || PROFILE_PATH;

  if (!name || !email) {
    flashRedirect(returnTo, "error", "Name and e-mail are required.");
  }

  const supabase = await getSupabase();

  const updates: Record<string, unknown> = { name, email };
  if (phone !== undefined) {
    updates.phone = phone;
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.userId);

  if (error) {
    flashRedirect(returnTo, "error", "Failed to update profile.");
  }

  revalidatePath(returnTo);
  revalidatePath("/admin/dashboard");
  revalidatePath("/staff/dashboard");
  revalidatePath("/operator/dashboard");
  revalidatePath("/user/dashboard");
  flashRedirect(returnTo, "success", "Profile information updated successfully!");
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

export async function updatePasswordAction(formData: FormData) {
  const session = await requireSession();

  const returnTo = str(formData, "return_to") || PROFILE_PATH;
  const current = str(formData, "current_password");
  const next = str(formData, "new_password");
  const confirm = str(formData, "confirm_password");

  if (next !== confirm) {
    flashRedirect(returnTo, "error", "New passwords do not match.");
  }

  if (next.length < 6) {
    flashRedirect(returnTo, "error", "Password must be at least 6 characters.");
  }

  const supabase = await getSupabase();

  // Verify the current password exactly like `password_verify()` did.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: current,
  });

  if (verifyError) {
    flashRedirect(returnTo, "error", "Current password is incorrect.");
  }

  const { error } = await supabase.auth.updateUser({ password: next });

  if (error) {
    flashRedirect(returnTo, "error", error.message);
  }

  revalidatePath(returnTo);
  flashRedirect(returnTo, "success", "Password updated successfully!");
}

/* ------------------------------------------------------------------ */
/* Payment QR code                                                     */
/* ------------------------------------------------------------------ */

export async function uploadQrCodeAction(formData: FormData) {
  await requireRole("admin", "operator");

  const upload = file(formData, "qr_code_image");

  if (!upload) {
    flashRedirect(PROFILE_PATH, "error", "File upload failed. Please try again.");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(upload.type)) {
    flashRedirect(
      PROFILE_PATH,
      "error",
      "Invalid image type! Please upload a PNG, JPG, or WEBP image.",
    );
  }

  const supabase = await getSupabase();

  // The legacy handler always wrote `public/assets/images/qr_code_payment.png`.
  const result = await uploadFile(supabase, {
    bucket: BUCKETS.siteAssets,
    fileName: "qr_code_payment.png",
    file: upload,
  });

  if (!result.ok) {
    flashRedirect(PROFILE_PATH, "error", "Failed to save QR code image file to server.");
  }

  revalidatePath(PROFILE_PATH);
  revalidatePath("/");
  flashRedirect(
    PROFILE_PATH,
    "success",
    "Payment QR code updated successfully!",
  );
}

/* ------------------------------------------------------------------ */
/* Rental agreement (site content)                                     */
/* ------------------------------------------------------------------ */

import { sanitizeRichText } from "@/lib/security";

export async function saveRentalAgreementAction(formData: FormData) {
  const session = await requireRole("admin", "operator");

  const html = sanitizeRichText(str(formData, "rental_agreement_html"));
  const supabase = await getSupabase();

  const { data: existing } = await supabase
    .from("site_content")
    .select("id")
    .eq("content_key", "rental_agreement_html")
    .maybeSingle();

  const row = existing as { id: number } | null;

  const { error } = row
    ? await supabase
        .from("site_content")
        .update({
          content_value: html,
          updated_by: session.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
    : await supabase.from("site_content").insert({
        content_key: "rental_agreement_html",
        content_value: html,
        updated_by: session.userId,
      });

  if (error) {
    flashRedirect(
      PROFILE_PATH,
      "error",
      "Failed to save rental agreement. Please try again.",
    );
  }

  revalidatePath(PROFILE_PATH);
  revalidatePath("/");
  flashRedirect(PROFILE_PATH, "success", "Rental agreement updated successfully!");
}
