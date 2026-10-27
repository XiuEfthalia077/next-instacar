/**
 * Booking transactional e-mails.
 *
 * Status lifecycle notifications (Confirmed, Released, Completed, Cancelled).
 * Uses the unified InstaCar responsive HTML template design system from templates.ts.
 */

import { emailButton, emailWrapper } from "@/lib/emails/templates";

export function bookingConfirmedEmail(name: string, dashboardUrl: string) {
  const safeName = name || "Valued Customer";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      Great news! Your booking has been successfully confirmed. Our team is already preparing your vehicle to ensure it is thoroughly inspected, cleaned, fueled, and ready for your scheduled pickup.
    </p>

    <!-- Status Box -->
    <div style="background-color: #1a1a1a; border: 1px solid #282828; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center;">
      <span style="color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; display: block; margin-bottom: 6px;">
        CURRENT RESERVATION STATUS
      </span>
      <span style="display: inline-block; background-color: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 800; font-size: 16px; padding: 6px 18px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
        Ready for Pickup
      </span>
    </div>

    <p style="color: #cccccc; font-size: 14px; margin: 20px 0 0 0;">
      You can view your full booking schedule, check branch directions, and manage your reservation anytime through your dashboard.
    </p>

    ${emailButton({ href: dashboardUrl, label: "View Booking in Dashboard" })}
  `;

  return {
    subject: "Booking Confirmed — InstaCar",
    html: emailWrapper({
      heading: "Booking Confirmed!",
      subheading: "Your vehicle is ready",
      content,
    }),
  };
}

export function vehicleReleasedEmail(name: string, dashboardUrl: string) {
  const safeName = name || "Valued Customer";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      Your vehicle has been successfully inspected and released. You are officially on the road! Drive safely, follow local traffic guidelines, and enjoy your journey with InstaCar.
    </p>

    <!-- Status Box -->
    <div style="background-color: #1a1a1a; border: 1px solid #282828; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center;">
      <span style="color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; display: block; margin-bottom: 6px;">
        CURRENT TRIP STATUS
      </span>
      <span style="display: inline-block; background-color: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 800; font-size: 16px; padding: 6px 18px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
        Vehicle On The Road
      </span>
    </div>

    <p style="color: #cccccc; font-size: 14px; margin: 20px 0 0 0;">
      Need roadside assistance or wish to request an extension? Access your active trip details directly from your portal.
    </p>

    ${emailButton({ href: dashboardUrl, label: "View Active Trip" })}
  `;

  return {
    subject: "Vehicle Released — InstaCar",
    html: emailWrapper({
      heading: "Vehicle Released!",
      subheading: "Have a safe and pleasant journey",
      content,
    }),
  };
}

export function tripCompletedEmail(name: string, reviewUrl: string) {
  const safeName = name || "Valued Customer";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      Thank you for riding with <strong>InstaCar</strong>! Your vehicle return has been logged and the trip is marked as completed. We truly hope you had a smooth and memorable experience.
    </p>

    <!-- Status Box -->
    <div style="background-color: #1a1a1a; border: 1px solid #282828; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center;">
      <span style="color: #888888; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 2px; display: block; margin-bottom: 6px;">
        COMPLETED TRIP
      </span>
      <span style="display: inline-block; background-color: rgba(255, 204, 0, 0.15); color: #ffcc00; border: 1px solid rgba(255, 204, 0, 0.3); font-weight: 800; font-size: 16px; padding: 6px 18px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
        Trip Successfully Completed
      </span>
    </div>

    <p style="color: #cccccc; font-size: 14px; margin: 20px 0 0 0; text-align: center;">
      Your feedback helps us continuously improve our fleet and customer experience. Could you take a moment to rate your ride?
    </p>

    ${emailButton({ href: reviewUrl, label: "Leave a Review" })}
  `;

  return {
    subject: `How was your ride, ${safeName}? — InstaCar`,
    html: emailWrapper({
      heading: "Trip Completed!",
      subheading: "Thank you for riding with InstaCar",
      content,
    }),
  };
}

export function bookingCancelledEmail(name: string, dashboardUrl: string) {
  const safeName = name || "Customer";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      This email confirms that your booking has been cancelled. As per standard rental terms, a cancellation processing fee has been applied.
    </p>

    <!-- Status & Fee Box -->
    <div style="background-color: #1a1a1a; border-left: 4px solid #ef4444; border-radius: 10px; padding: 20px 22px; margin: 24px 0;">
      <span style="color: #ef4444; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1.5px; display: block; margin-bottom: 4px;">
        CANCELLATION NOTICE
      </span>
      <div style="font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">
        &#8369;500.00 <span style="font-size: 13px; font-weight: 500; color: #888888;">(Cancellation Fee)</span>
      </div>
      <p style="margin: 0; font-size: 13px; color: #aaaaaa; line-height: 1.5;">
        Any remaining down payment balance will be credited according to refund terms.
      </p>
    </div>

    <p style="color: #cccccc; font-size: 14px; margin: 20px 0 0 0;">
      If you have questions regarding this cancellation or would like to schedule another vehicle, our support desk is ready to help.
    </p>

    ${emailButton({ href: dashboardUrl, label: "View Dashboard & Rebook", outline: true })}
  `;

  return {
    subject: "Booking Cancellation Notice — InstaCar",
    html: emailWrapper({
      heading: "Booking Cancelled",
      subheading: "Notice of Cancellation",
      content,
    }),
  };
}

/** Absolute link helper using `NEXT_PUBLIC_SITE_URL`. */
export function siteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
