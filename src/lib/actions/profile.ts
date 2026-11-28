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
import { BUCKETS, buildFileName, uploadFile } from "@/lib/storage";

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

/* ------------------------------------------------------------------ */
/* User Documents (Hassle-Free Verification)                          */
/* ------------------------------------------------------------------ */

export async function updateUserDocumentsAction(formData: FormData) {
  const session = await requireSession();
  const returnTo = str(formData, "return_to") || "/user/profile";

  const primaryFile = file(formData, "primary_id");
  const secondaryFile = file(formData, "secondary_id");
  const billingFile = file(formData, "proof_of_billing");

  if (!primaryFile && !secondaryFile && !billingFile) {
    flashRedirect(returnTo, "error", "Please select a document to upload.");
  }

  const supabase = await getSupabase();
  const folder = `user_${session.userId}`;
  const updates: Record<string, string> = {};

  if (primaryFile) {
    const fileName = buildFileName("primary", primaryFile);
    const res = await uploadFile(supabase, {
      bucket: BUCKETS.userDocuments,
      folder,
      fileName,
      file: primaryFile,
    });
    if (res.ok) updates.primary_id_url = `${folder}/${fileName}`;
    else flashRedirect(returnTo, "error", `Primary ID upload failed: ${res.error}`);
  }

  if (secondaryFile) {
    const fileName = buildFileName("secondary", secondaryFile);
    const res = await uploadFile(supabase, {
      bucket: BUCKETS.userDocuments,
      folder,
      fileName,
      file: secondaryFile,
    });
    if (res.ok) updates.secondary_id_url = `${folder}/${fileName}`;
    else flashRedirect(returnTo, "error", `Secondary ID upload failed: ${res.error}`);
  }

  if (billingFile) {
    const fileName = buildFileName("billing", billingFile);
    const res = await uploadFile(supabase, {
      bucket: BUCKETS.userDocuments,
      folder,
      fileName,
      file: billingFile,
    });
    if (res.ok) updates.proof_of_billing_url = `${folder}/${fileName}`;
    else flashRedirect(returnTo, "error", `Proof of Billing upload failed: ${res.error}`);
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", session.userId);

    if (error) {
      flashRedirect(returnTo, "error", `Failed to save documents: ${error.message}`);
    }
  }

  revalidatePath(returnTo);
  flashRedirect(
    returnTo,
    "success",
    "Documents updated successfully! They will now automatically appear on your bookings.",
  );
}

export async function deleteUserDocumentAction(formData: FormData) {
  const session = await requireSession();
  const returnTo = str(formData, "return_to") || "/user/profile";
  const docType = str(formData, "doc_type");

  const columnMap: Record<string, string> = {
    primary: "primary_id_url",
    secondary: "secondary_id_url",
    billing: "proof_of_billing_url",
  };

  const col = columnMap[docType];
  if (!col) {
    flashRedirect(returnTo, "error", "Invalid document type.");
  }

  const supabase = await getSupabase();
  await supabase.from("users").update({ [col]: null }).eq("id", session.userId);

  revalidatePath(returnTo);
  flashRedirect(returnTo, "success", "Document removed.");
}

/**
 * Revision-safe document upload / re-upload (Task 3).
 * Preserves all prior rejected files in storage & `user_document_revisions`
 * for Admin auditing, resets the new version status to `PENDING_REVIEW`, and
 * syncs the active URL column on `public.users`.
 */
export async function reuploadUserDocumentAction(formData: FormData) {
  const session = await requireSession();
  const returnTo = str(formData, "return_to") || "/user/profile";
  const docType = str(formData, "doc_type");
  const uploadedFile = file(formData, "document_file");

  const columnMap: Record<string, string> = {
    primary_id: "primary_id_url",
    secondary_id: "secondary_id_url",
    proof_of_billing: "proof_of_billing_url",
  };

  const userCol = columnMap[docType];
  if (!userCol) {
    flashRedirect(returnTo, "error", "Invalid document type.");
  }

  if (!uploadedFile) {
    flashRedirect(returnTo, "error", "Please select a valid JPG, PNG, WEBP, or PDF file.");
  }

  const supabase = await getSupabase();
  const folder = `user_${session.userId}`;
  const fileName = buildFileName(docType, uploadedFile);

  const uploadRes = await uploadFile(supabase, {
    bucket: BUCKETS.userDocuments,
    folder,
    fileName,
    file: uploadedFile,
  });

  if (!uploadRes.ok) {
    flashRedirect(returnTo, "error", `Upload failed: ${uploadRes.error}`);
  }

  const filePath = `${folder}/${fileName}`;

  // Determine next version number & archive prior active revision without deleting old files
  const { data: existingRevs } = await supabase
    .from("user_document_revisions")
    .select("id, version")
    .eq("user_id", session.userId)
    .eq("doc_type", docType)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion =
    existingRevs && existingRevs.length > 0
      ? Number((existingRevs[0] as { version: number }).version) + 1
      : 1;

  await supabase
    .from("user_document_revisions")
    .update({ is_current: false })
    .eq("user_id", session.userId)
    .eq("doc_type", docType)
    .eq("is_current", true);

  const { error: revError } = await supabase
    .from("user_document_revisions")
    .insert({
      user_id: session.userId,
      doc_type: docType,
      version: nextVersion,
      file_path: filePath,
      file_name: uploadedFile.name || fileName,
      status: "PENDING_REVIEW",
      admin_remarks: null,
      is_current: true,
    });

  if (revError) {
    console.warn("[reuploadUserDocumentAction] revision insert warning:", revError.message);
  }

  // Keep public.users in sync and ensure pending verification status if rejected
  const { data: currentUser } = await supabase
    .from("users")
    .select("account_status, id_verified")
    .eq("id", session.userId)
    .maybeSingle();

  const userUpdates: Record<string, unknown> = { [userCol]: filePath };
  const currentStatus = (currentUser as { account_status?: string | null; id_verified?: boolean } | null)?.account_status;
  if (currentStatus !== "APPROVED") {
    userUpdates.account_status = "PENDING_VERIFICATION";
  }

  const { error: userErr } = await supabase
    .from("users")
    .update(userUpdates)
    .eq("id", session.userId);

  if (userErr) {
    flashRedirect(returnTo, "error", `Failed to save document: ${userErr.message}`);
  }

  revalidatePath(returnTo);
  revalidatePath("/user/dashboard");
  flashRedirect(
    returnTo,
    "success",
    "Document uploaded and submitted for review. Status is now PENDING REVIEW.",
  );
}
