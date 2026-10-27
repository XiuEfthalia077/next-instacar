/**
 * SMTP mailer.
 *
 * Transports transactional emails and website inquiries.
 * Credentials read from environment (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ADMIN_INBOX).
 */

import nodemailer from "nodemailer";

export type MailResult = { ok: true } | { ok: false; error: string };

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD,
  );
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT ?? 465);
  const isSecure = port === 465;
  const pass = (process.env.SMTP_PASSWORD ?? "").replace(/\s+/g, "");

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass,
    },
  });

  return transporter;
}

/** Sends an HTML mail. Returns `{ ok: false }` when SMTP fails. */
export async function sendMail(options: {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<MailResult> {
  if (!smtpConfigured()) {
    console.warn("[Mailer] SMTP credentials missing in environment variables.");
    return { ok: false, error: "SMTP is not configured." };
  }

  const fromAddress =
    process.env.SMTP_FROM ||
    `"InstaCar Support" <${process.env.SMTP_USER}>`;

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.info(`[Mailer] Message delivered successfully. ID: ${info.messageId}`);
    return { ok: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Mailer] Email delivery failed: ${errorMsg}`);
    return {
      ok: false,
      error: errorMsg,
    };
  }
}

/** The inbox that receives website inquiries. */
export function adminInbox() {
  return (
    process.env.ADMIN_INBOX ??
    process.env.SMTP_USER ??
    "ramesesjay@gmail.com"
  );
}
