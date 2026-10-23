"use server";

import type { ActionState } from "@/lib/action-state";
import { adminInbox, sendMail } from "@/lib/mailer";
import { getSupabase, requireRole } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { contactMessageSchema } from "@/lib/validations";

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

  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject: finalSubject,
    message,
  });

  if (error) {
    return { error: error.message };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(finalSubject);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #121212; color: #ffffff;">
      <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 25px; border-radius: 12px; border: 1px solid #2c2c2c; border-top: 4px solid #ffcc00;">
        <h2 style="color: #ffcc00; margin-top: 0;">New Website Inquiry</h2>
        <hr style="border: 0; border-top: 1px solid #2c2c2c; margin: 15px 0;">
        <p><strong>Sender Name:</strong> ${safeName}</p>
        <p><strong>Sender Email:</strong> <a href="mailto:${safeEmail}" style="color: #ffcc00;">${safeEmail}</a></p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <div style="background: #0a0a0a; padding: 15px; border-left: 3px solid #ffcc00; border-radius: 6px; margin-top: 10px; color: #dddddd;">
          ${safeMessage}
        </div>
      </div>
    </div>
  `;

  const plain = [
    "New Website Inquiry",
    "",
    `Sender Name: ${name}`,
    `Sender Email: ${email}`,
    `Subject: ${finalSubject}`,
    "",
    "Message:",
    message,
  ].join("\n");

  const mail = await sendMail({
    to: adminInbox(),
    replyTo: email,
    subject: `New Website Inquiry: ${finalSubject}`,
    html,
    text: plain,
  });

  if (!mail.ok) {
    // The legacy app showed "Saved with Warning" in this exact situation.
    return {
      success:
        "Your message has been saved. Email delivery failed, please contact us directly.",
    };
  }

  return { success: "Your message has been saved and sent successfully." };
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
