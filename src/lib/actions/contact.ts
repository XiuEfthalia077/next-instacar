"use server";

import type { ActionState } from "@/lib/action-state";
import { adminInbox } from "@/lib/mailer";
import { getSupabase, requireRole } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { contactMessageSchema } from "@/lib/validations";
import { queueEmail } from "@/lib/queue";

const CUSTOM_SUBJECT = "Other / Custom Subject";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Public contact form — port of `car-rental/contact_process.php`.
 *
 * 1. stores the message in `contact_messages`
 * 2. notifies the admin inbox (best effort, exactly like the legacy PHPMailer
 *    call which never blocked the insert)
 */
export async function sendContactMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const customSubject = String(formData.get("custom_subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  // The legacy handler replaced the subject with the custom value when the
  // "Other / Custom Subject" option was picked.
  const finalSubject =
    subject === CUSTOM_SUBJECT && customSubject ? customSubject : subject;

  // Rate limiting to prevent contact form abuse and SMTP spamming
  const rateLimitKey = `contact_${email || "anonymous"}`;
  const limit = checkRateLimit(rateLimitKey, { interval: 60_000, maxRequests: 5 });
  if (!limit.success) {
    return {
      error: `Too many messages sent. Please wait ${limit.reset} seconds before trying again.`,
    };
  }

  // Schema validation with Zod
  const validation = contactMessageSchema.safeParse({
    name,
    email,
    subject: finalSubject,
    customSubject,
    message,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await getSupabase();

  // Save inquiry to contact_messages
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject: finalSubject,
    message,
  });

  if (error) {
    return { error: error.message };
  }

  // Feature D: Save to inquiries table (with fallback if table not yet created)
  try {
    await supabase.from("inquiries").insert({
      name,
      email,
      subject: finalSubject,
      message,
    });
  } catch (inquiryDbErr) {
    console.warn("[sendContactMessageAction] Optional inquiries table insert skipped:", inquiryDbErr);
  }

  // Feature D: Queue thank-you email to user & notification email to support team via QStash
  try {
    // 1. Thank-you email to user
    await queueEmail({
      type: "inquiry_user_confirmation",
      email,
      data: {
        name,
        subject: finalSubject,
        message,
      },
    });

    // 2. Notification email to support team
    const adminEmail = adminInbox();
    if (adminEmail) {
      await queueEmail({
        type: "inquiry_admin_notification",
        email: adminEmail,
        data: {
          name,
          email,
          subject: finalSubject,
          message,
          createdAt: new Date().toISOString(),
        },
      });
    }
  } catch (queueErr) {
    console.error("[sendContactMessageAction] Failed to enqueue inquiry emails:", queueErr);
  }

  return {
    success:
      "Thank you for contacting InstaCar! Your inquiry has been received, and our support team will get back to you shortly.",
  };
}

/* ------------------------------------------------------------------ */
/* Admin inbox                                                         */
/* ------------------------------------------------------------------ */

/**
 * Marks every unread inquiry as read — the legacy
 * `pages/admin/contact_messages.php` did this on page load:
 *
 *   UPDATE contact_messages SET is_read = 1 WHERE is_read = 0
 */
export async function markContactMessagesReadAction() {
  await requireRole("admin");

  const supabase = await getSupabase();
  await supabase.from("contact_messages").update({ is_read: true }).eq("is_read", false);
}

/** Deletes an inquiry — `contact_messages.php` `?delete=<id>`. */
export async function deleteContactMessageAction(formData: FormData) {
  await requireRole("admin");

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);

  if (!Number.isFinite(id) || id <= 0) {
    flashRedirect("/admin/contact_messages", "error", "Invalid message.");
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from("contact_messages").delete().eq("id", id);

  if (error) {
    flashRedirect(
      "/admin/contact_messages",
      "error",
      `Delete failed: ${error.message}`,
    );
  }

  revalidatePath("/admin/contact_messages");
  flashRedirect("/admin/contact_messages", "success", "Message deleted.");
}
