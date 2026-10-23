/**
 * SMTP mailer.
 *
 * The legacy app used PHPMailer (`car-rental/config/send_email.php` and
 * `car-rental/contact_process.php`). The same SMTP credentials are now read
 * from the environment (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
 * `SMTP_FROM`), so the transactional e-mails keep working.
 *
 * Sending is best effort: when the SMTP settings are missing the caller only
 * gets `false` and the database write still counts as done — exactly the
 * "Saved with Warning" behaviour of `contact_process.php`.
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

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

/** Sends an HTML mail. Returns `{ ok: false }` when SMTP is not configured. */
export async function sendMail(options: {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<MailResult> {
  if (!smtpConfigured()) {
    return { ok: false, error: "SMTP is not configured." };
  }

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** The inbox that receives the website inquiries. */
export function adminInbox() {
  return (
    process.env.ADMIN_INBOX ??
    process.env.SMTP_USER ??
    "ramesesjay1@gmail.com"
  );
}
