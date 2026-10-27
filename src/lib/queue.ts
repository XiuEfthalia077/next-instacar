/**
 * Upstash QStash Background Job Queue Helper.
 *
 * Enqueues asynchronous email jobs to /api/queues/send-email to avoid
 * Next.js Server Action / Vercel Serverless Function timeouts.
 */

import { Client } from "@upstash/qstash";
import { sendTransactionalEmail } from "@/lib/email-service";
import {
  buildWelcomeEmail,
  buildBookingClientEmail,
  buildBookingAdminEmail,
  buildOtpEmail,
  buildInquiryUserEmail,
  buildInquiryAdminEmail,
} from "@/lib/emails/templates";

export type EmailJobType =
  | "welcome"
  | "booking_client_confirmation"
  | "booking_admin_notification"
  | "otp_verification"
  | "inquiry_user_confirmation"
  | "inquiry_admin_notification";

export interface EmailJobPayload {
  type: EmailJobType;
  email: string;
  data: Record<string, any>;
}

let qstashClient: Client | null = null;

function getQStashClient(): Client | null {
  const token =
    process.env.QSTASH_TOKEN ||
    process.env.UPSTASH_TOKEN ||
    process.env.UPSTASH_QSTASH_TOKEN;

  if (!token) return null;

  if (!qstashClient) {
    qstashClient = new Client({ token });
  }

  return qstashClient;
}

/**
 * Resolves the absolute application origin for QStash callbacks.
 */
export function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

/**
 * Executes the email job by selecting the appropriate template and delivering via email-service.
 * This is used by both the QStash worker endpoint and the direct dev-fallback runner.
 */
export async function executeEmailJob(payload: EmailJobPayload) {
  const { type, email, data } = payload;

  if (!email) {
    throw new Error(`Email recipient is missing for job type: ${type}`);
  }

  let emailContent: { subject: string; html: string; text?: string };

  switch (type) {
    case "welcome":
      emailContent = buildWelcomeEmail({
        name: data.name,
        loginUrl: data.loginUrl || `${resolveAppUrl()}/login`,
      });
      break;

    case "booking_client_confirmation":
      emailContent = buildBookingClientEmail({
        bookingId: data.bookingId,
        name: data.name,
        carName: data.carName,
        startDate: data.startDate,
        endDate: data.endDate,
        pickupTime: data.pickupTime,
        returnTime: data.returnTime,
        fulfillmentType: data.fulfillmentType,
        deliveryAddress: data.deliveryAddress,
        totalPrice: data.totalPrice,
        dashboardUrl: data.dashboardUrl || `${resolveAppUrl()}/user/mybookings`,
      });
      break;

    case "booking_admin_notification":
      emailContent = buildBookingAdminEmail({
        bookingId: data.bookingId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        carName: data.carName,
        startDate: data.startDate,
        endDate: data.endDate,
        bookingType: data.bookingType,
        totalPrice: data.totalPrice,
        adminUrl: data.adminUrl || `${resolveAppUrl()}/admin/bookings_online`,
      });
      break;

    case "otp_verification":
      emailContent = buildOtpEmail({
        otp: data.otp,
        expiresInMinutes: data.expiresInMinutes ?? 10,
        name: data.name,
      });
      break;

    case "inquiry_user_confirmation":
      emailContent = buildInquiryUserEmail({
        name: data.name,
        subject: data.subject,
        message: data.message,
      });
      break;

    case "inquiry_admin_notification":
      emailContent = buildInquiryAdminEmail({
        name: data.name,
        email: data.email || email,
        subject: data.subject,
        message: data.message,
        createdAt: data.createdAt,
      });
      break;

    default:
      throw new Error(`Unknown email job type: ${type}`);
  }

  return sendTransactionalEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Publishes an email job to Upstash QStash.
 *
 * If QStash is not configured (e.g. during local development) or network dispatch fails,
 * it safely falls back to direct execution in the background so the user action is never blocked
 * and emails are never silently lost.
 */
export async function queueEmail(payload: EmailJobPayload): Promise<{
  queued: boolean;
  messageId?: string;
  fallback?: boolean;
  error?: string;
}> {
  const client = getQStashClient();
  const workerEndpoint = `${resolveAppUrl()}/api/queues/send-email`;

  if (!client) {
    console.warn(
      `[QStash] Token not configured (QSTASH_TOKEN / UPSTASH_TOKEN). Executing email job directly for "${payload.type}" to ${payload.email}`,
    );
    try {
      await executeEmailJob(payload);
      return { queued: false, fallback: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[QStash][FallbackError] Failed to execute job directly: ${errorMsg}`);
      return { queued: false, fallback: true, error: errorMsg };
    }
  }

  try {
    const result = await client.publishJSON({
      url: workerEndpoint,
      body: payload,
      retries: 3,
    });

    console.info(
      `[QStash] Enqueued job "${payload.type}" to ${payload.email}. MessageId: ${result.messageId}`,
    );

    return { queued: true, messageId: result.messageId };
  } catch (publishErr) {
    const errorMsg = publishErr instanceof Error ? publishErr.message : String(publishErr);
    console.error(
      `[QStash][PublishError] Failed to enqueue to QStash (${errorMsg}). Falling back to direct dispatch.`,
    );

    try {
      await executeEmailJob(payload);
      return { queued: false, fallback: true };
    } catch (execErr) {
      const execErrorMsg = execErr instanceof Error ? execErr.message : String(execErr);
      console.error(`[QStash][FallbackError] Direct fallback failed: ${execErrorMsg}`);
      return { queued: false, fallback: true, error: execErrorMsg };
    }
  }
}
