/**
 * Transactional Email Service.
 *
 * Provides a unified abstraction layer supporting:
 * 1. Resend (@resend/node / resend SDK) via RESEND_API_KEY
 * 2. Nodemailer (SMTP credentials)
 * 3. Safe Dev Simulator (when credentials are absent, preventing runtime errors in dev/testing)
 */

import { Resend } from "resend";
import { sendMail } from "@/lib/mailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

export type EmailDeliveryResult =
  | { ok: true; id?: string; provider: "resend" | "smtp" | "simulated" }
  | { ok: false; error: string };

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

function resolveFromAddress(customFrom?: string): string {
  if (customFrom) return customFrom;
  return (
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    `"InstaCar Support" <no-reply@${process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : "instacar.ph"}>`
  );
}

/**
 * Sends a transactional email through the configured provider (Resend or SMTP).
 * Falls back safely to simulation if no provider key is configured.
 */
export async function sendTransactionalEmail(
  options: SendEmailOptions,
): Promise<EmailDeliveryResult> {
  const { to, subject, html, text, replyTo } = options;
  const from = resolveFromAddress(options.from);

  // 1. Try Resend if configured
  const resend = getResendClient();
  if (resend) {
    try {
      const response = await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        replyTo,
      });

      if (response.error) {
        console.error("[EmailService][Resend] Error:", response.error.message);
        return { ok: false, error: response.error.message };
      }

      console.info(`[EmailService][Resend] Sent successfully to ${to}. ID: ${response.data?.id}`);
      return { ok: true, id: response.data?.id, provider: "resend" };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EmailService][Resend] Failed: ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }
  }

  // 2. Try SMTP via Nodemailer
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  ) {
    try {
      const result = await sendMail({
        to,
        replyTo,
        subject,
        html,
        text,
      });

      if (result.ok) {
        console.info(`[EmailService][SMTP] Sent successfully to ${to}`);
        return { ok: true, provider: "smtp" };
      }

      console.error(`[EmailService][SMTP] Failed: ${result.error}`);
      return { ok: false, error: result.error };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EmailService][SMTP] Exception: ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }
  }

  // 3. Fallback: Dev Mode Simulation
  console.warn(
    `[EmailService][Simulated] No email provider configured (RESEND_API_KEY or SMTP). Simulating email delivery to: ${to} | Subject: "${subject}"`,
  );
  return { ok: true, provider: "simulated" };
}
