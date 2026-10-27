/**
 * HTML Email Templates for InstaCar.
 *
 * Professional, brand-aligned (Yellow #ffcc00 on Dark #0d0d0d / #161616)
 * responsive transactional templates with plain-text versions.
 *
 * All emails share the same typography, layout shell, color scheme,
 * table structures, button styles, and footer branding.
 */

export function emailWrapper({
  heading,
  subheading,
  content,
}: {
  heading: string;
  subheading?: string;
  content: string;
}): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #0d0d0d; width: 100%; padding: 32px 12px; box-sizing: border-box;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #161616; border-radius: 16px; overflow: hidden; border: 1px solid #282828; box-shadow: 0 12px 35px rgba(0,0,0,0.6);">
      <!-- Brand Header -->
      <div style="background: linear-gradient(135deg, #ffcc00 0%, #e6b800 100%); padding: 36px 24px; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #1a1a1a;">
          INSTACAR RENTAL SERVICE
        </p>
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">
          ${heading}
        </h1>
        ${
          subheading
            ? `<p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 700; color: #222222;">${subheading}</p>`
            : ""
        }
      </div>

      <!-- Body Content -->
      <div style="padding: 32px 28px; line-height: 1.65; color: #cccccc; font-size: 15px;">
        ${content}

        <!-- Unified Footer -->
        <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #282828; text-align: center; font-size: 12px; color: #777777; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;">
            Need immediate assistance? Contact our 24/7 hotline at <strong style="color: #ffcc00;">+63 (917) 000-0000</strong>
          </p>
          <p style="margin: 0; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; color: #555555;">
            &copy; ${year} InstaCar Rental Service Philippines. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function emailButton({
  href,
  label,
  outline = false,
}: {
  href: string;
  label: string;
  outline?: boolean;
}): string {
  const style = outline
    ? "display: inline-block; border: 2px solid #ffcc00; color: #ffcc00; background-color: transparent; font-weight: 800; font-size: 13px; padding: 13px 32px; border-radius: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;"
    : "display: inline-block; background-color: #ffcc00; color: #000000; font-weight: 800; font-size: 13px; padding: 14px 34px; border-radius: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(255, 204, 0, 0.35);";

  return `
  <div style="text-align: center; margin: 30px 0;">
    <a href="${href}" target="_blank" style="${style}">
      ${label}
    </a>
  </div>`;
}

/* -------------------------------------------------------------------------- */
/* Feature A: Welcome Email                                                   */
/* -------------------------------------------------------------------------- */

export function buildWelcomeEmail({
  name,
  loginUrl = "https://instacar.vercel.app/login",
}: {
  name: string;
  loginUrl?: string;
}) {
  const safeName = name || "Valued Customer";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      Welcome to <strong>InstaCar</strong>! We are thrilled to have you join our premier vehicle rental network. Whether you are traveling for business, planning a weekend getaway, or exploring the islands, we have the ideal ride ready for you.
    </p>

    <div style="background-color: #1a1a1a; border-left: 4px solid #ffcc00; border-radius: 10px; padding: 20px 22px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #ffcc00; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
        What you can do right now:
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #dddddd; font-size: 14px; line-height: 1.8;">
        <li><strong>Browse Diverse Fleet:</strong> Sedans, SUVs, MPVs, and premium vans.</li>
        <li><strong>Flexible Rentals:</strong> Hourly, daily, and long-term self-drive or with driver.</li>
        <li><strong>Fast Bookings:</strong> Instant online checkout and reservation tracking.</li>
        <li><strong>24/7 Road Support:</strong> Cleaned, inspected, and fully insured vehicles.</li>
      </ul>
    </div>

    <p style="color: #cccccc; margin: 20px 0 0 0;">
      Click the button below to sign in to your dashboard, manage your profile, and rent your first vehicle.
    </p>

    ${emailButton({ href: loginUrl, label: "Explore Vehicles & Book" })}
  `;

  return {
    subject: "Welcome to InstaCar — Your Premium Rental Experience Awaits",
    html: emailWrapper({
      heading: "Welcome to InstaCar!",
      subheading: "Your journey starts here",
      content,
    }),
    text: `Hello ${safeName},\n\nWelcome to InstaCar! We are excited to have you join our rental community.\n\nSign in to book your first car: ${loginUrl}\n\n- The InstaCar Team`,
  };
}

/* -------------------------------------------------------------------------- */
/* Feature B: Booking Notifications                                           */
/* -------------------------------------------------------------------------- */

export function buildBookingClientEmail({
  bookingId,
  name,
  carName,
  startDate,
  endDate,
  pickupTime,
  returnTime,
  fulfillmentType,
  deliveryAddress,
  totalPrice,
  dashboardUrl = "https://instacar.vercel.app/user/mybookings",
}: {
  bookingId: number;
  name: string;
  carName: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  fulfillmentType?: string;
  deliveryAddress?: string | null;
  totalPrice: number;
  dashboardUrl?: string;
}) {
  const safeName = name || "Customer";
  const refCode = `BK-${bookingId}`;
  const formattedTotal = Number(totalPrice).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      Thank you for choosing InstaCar! We have successfully received your booking. Here are your reservation details:
    </p>

    <div style="background-color: #1a1a1a; border: 1px solid #282828; border-radius: 14px; padding: 22px 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; padding: 8px 0; border-bottom: 1px solid #262626;">
            Booking Reference
          </td>
          <td style="color: #ffcc00; font-size: 15px; font-weight: 800; text-align: right; padding: 8px 0; border-bottom: 1px solid #262626;">
            #${refCode}
          </td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 10px 0 4px 0;">Selected Vehicle</td>
          <td style="color: #ffffff; font-size: 15px; font-weight: 800; text-align: right; padding: 10px 0 4px 0;">${carName}</td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Pickup Schedule</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${startDate} &bull; ${pickupTime}</td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Return Schedule</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${endDate} &bull; ${returnTime}</td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Fulfillment Type</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${fulfillmentType || "Pickup"}</td>
        </tr>
        ${
          deliveryAddress
            ? `
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Delivery Address</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${deliveryAddress}</td>
        </tr>
        `
            : ""
        }
        <tr>
          <td style="color: #ffffff; font-size: 15px; font-weight: 800; padding: 16px 0 0 0; border-top: 1px solid #262626;">
            Total Price
          </td>
          <td style="color: #ffcc00; font-size: 22px; font-weight: 900; text-align: right; padding: 16px 0 0 0; border-top: 1px solid #262626;">
            &#8369;${formattedTotal}
          </td>
        </tr>
      </table>
    </div>

    <p style="color: #cccccc; font-size: 14px; margin: 20px 0 0 0;">
      Our team is currently reviewing your documents and preparing the vehicle. You can monitor your booking status and upload any additional requirements from your portal.
    </p>

    ${emailButton({ href: dashboardUrl, label: "Track Booking Details" })}
  `;

  return {
    subject: `Booking Confirmation #${refCode} — InstaCar`,
    html: emailWrapper({
      heading: "Booking Received",
      subheading: `Reference Code: #${refCode}`,
      content,
    }),
    text: `Hello ${safeName},\n\nYour booking #${refCode} for ${carName} from ${startDate} to ${endDate} has been recorded.\nTotal: PHP ${formattedTotal}\n\nTrack booking: ${dashboardUrl}`,
  };
}

export function buildBookingAdminEmail({
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  carName,
  startDate,
  endDate,
  bookingType,
  totalPrice,
  adminUrl = "https://instacar.vercel.app/admin/bookings_online",
}: {
  bookingId: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  carName: string;
  startDate: string;
  endDate: string;
  bookingType: "online" | "manual";
  totalPrice: number;
  adminUrl?: string;
}) {
  const refCode = `BK-${bookingId}`;
  const formattedTotal = Number(totalPrice).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Admin Dispatch Notification</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      A new <strong>${bookingType.toUpperCase()}</strong> booking has been created in the InstaCar platform.
    </p>

    <div style="background-color: #1a1a1a; border: 1px solid #282828; border-radius: 14px; padding: 22px 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; padding: 8px 0; border-bottom: 1px solid #262626;">
            Booking Reference
          </td>
          <td style="color: #ffcc00; font-size: 15px; font-weight: 800; text-align: right; padding: 8px 0; border-bottom: 1px solid #262626;">
            #${refCode}
          </td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 10px 0 4px 0;">Customer Name</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-align: right; padding: 10px 0 4px 0;">${customerName}</td>
        </tr>
        ${
          customerEmail
            ? `
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Customer Email</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${customerEmail}</td>
        </tr>
        `
            : ""
        }
        ${
          customerPhone
            ? `
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Customer Phone</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${customerPhone}</td>
        </tr>
        `
            : ""
        }
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Vehicle</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-align: right; padding: 6px 0;">${carName}</td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 13px; padding: 6px 0;">Schedule</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${startDate} to ${endDate}</td>
        </tr>
        <tr>
          <td style="color: #ffffff; font-size: 15px; font-weight: 800; padding: 16px 0 0 0; border-top: 1px solid #262626;">
            Total Price
          </td>
          <td style="color: #ffcc00; font-size: 22px; font-weight: 900; text-align: right; padding: 16px 0 0 0; border-top: 1px solid #262626;">
            &#8369;${formattedTotal}
          </td>
        </tr>
      </table>
    </div>

    ${emailButton({ href: adminUrl, label: "View in Admin Dashboard" })}
  `;

  return {
    subject: `[Admin Alert] New ${bookingType.toUpperCase()} Booking #${refCode} — ${customerName}`,
    html: emailWrapper({
      heading: "New Booking Alert",
      subheading: `Reference #${refCode}`,
      content,
    }),
    text: `New booking #${refCode} by ${customerName} for ${carName} (${startDate} to ${endDate}). Total: PHP ${formattedTotal}. View: ${adminUrl}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Feature C: Forgot Password & OTP Email                                     */
/* -------------------------------------------------------------------------- */

export function buildOtpEmail({
  otp,
  expiresInMinutes = 10,
  name,
}: {
  otp: string;
  expiresInMinutes?: number;
  name?: string;
}) {
  const greeting = name ? `Hello <strong style="color: #ffffff;">${name}</strong>,` : "Hello,";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">${greeting}</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      We received a request to reset your InstaCar account password. Use the 6-digit verification code below to complete the reset process:
    </p>

    <!-- OTP Display Box -->
    <div style="background-color: #121212; border: 2px dashed #ffcc00; border-radius: 14px; padding: 26px 20px; margin: 26px 0; text-align: center;">
      <span style="font-size: 12px; font-weight: 800; color: #888888; text-transform: uppercase; letter-spacing: 2px; display: block;">
        YOUR ONE-TIME PASSCODE (OTP)
      </span>
      <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ffcc00; margin: 12px 0; font-family: 'Courier New', Courier, monospace;">
        ${otp}
      </div>
      <span style="font-size: 12px; color: #999999;">
        Valid for <strong style="color: #ffffff;">${expiresInMinutes} minutes</strong>
      </span>
    </div>

    <!-- Security Warning -->
    <div style="background-color: #1a1a1a; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin: 24px 0;">
      <p style="margin: 0; font-size: 13px; color: #fca5a5; line-height: 1.5;">
        <strong>Security Notice:</strong> Never share this OTP with anyone. InstaCar staff will never ask for your code. If you did not make this request, you can safely ignore this email.
      </p>
    </div>
  `;

  return {
    subject: `Your InstaCar Password Reset Code: ${otp}`,
    html: emailWrapper({
      heading: "Password Reset Code",
      subheading: "One-Time Verification Passcode",
      content,
    }),
    text: `Your InstaCar password reset code is: ${otp}. It will expire in ${expiresInMinutes} minutes. If you did not request this, please ignore this email.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Feature D: Landing Page Contact / Inquiry Emails                           */
/* -------------------------------------------------------------------------- */

export function buildInquiryUserEmail({
  name,
  subject,
  message,
}: {
  name: string;
  subject: string;
  message: string;
}) {
  const safeName = name || "Customer";

  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      Thank you for reaching out to InstaCar Philippines! We have received your inquiry regarding <strong>&ldquo;${subject}&rdquo;</strong>.
    </p>

    <div style="background-color: #1a1a1a; border-left: 4px solid #ffcc00; border-radius: 10px; padding: 20px 22px; margin: 24px 0;">
      <span style="color: #ffcc00; font-size: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; display: block; margin-bottom: 8px;">
        Summary of your message:
      </span>
      <p style="color: #e5e5e5; font-style: italic; margin: 0; line-height: 1.6; font-size: 14px;">
        &ldquo;${message}&rdquo;
      </p>
    </div>

    <p style="color: #cccccc; font-size: 14px; margin: 20px 0 0 0;">
      Our support team typically responds within <strong>2 to 4 business hours</strong> (8:00 AM – 8:00 PM PHT). For urgent dispatch requests, feel free to call our direct hotline at +63 (917) 000-0000.
    </p>
  `;

  return {
    subject: `We've Received Your Inquiry — InstaCar Support`,
    html: emailWrapper({
      heading: "Inquiry Received",
      subheading: "Thank you for contacting us",
      content,
    }),
    text: `Hello ${safeName},\n\nWe have received your inquiry: "${subject}". Our team will respond shortly.\n\nThank you for choosing InstaCar!`,
  };
}

export function buildInquiryAdminEmail({
  name,
  email,
  subject,
  message,
  createdAt = new Date().toISOString(),
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt?: string;
}) {
  const content = `
    <p style="font-size: 18px; margin: 0 0 14px 0; color: #ffffff;">New Website Inquiry</p>
    <p style="color: #cccccc; margin: 0 0 20px 0;">
      A customer has submitted a new inquiry through the landing page contact form.
    </p>

    <div style="background-color: #1a1a1a; border: 1px solid #282828; border-radius: 14px; padding: 22px 24px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; padding: 6px 0;">Sender Name</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-align: right; padding: 6px 0;">${name}</td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; padding: 6px 0;">Sender Email</td>
          <td style="color: #ffcc00; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">
            <a href="mailto:${email}" style="color: #ffcc00; text-decoration: none;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; padding: 6px 0;">Subject</td>
          <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right; padding: 6px 0;">${subject}</td>
        </tr>
        <tr>
          <td style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; padding: 6px 0;">Received At</td>
          <td style="color: #ffffff; font-size: 13px; font-weight: 500; text-align: right; padding: 6px 0;">${createdAt}</td>
        </tr>
      </table>

      <div style="border-top: 1px solid #282828; padding-top: 14px;">
        <span style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block; margin-bottom: 8px;">
          Message Content:
        </span>
        <div style="background-color: #121212; border: 1px solid #222222; padding: 14px 16px; border-radius: 8px; color: #ffffff; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
          ${message}
        </div>
      </div>
    </div>

    ${emailButton({ href: `mailto:${email}?subject=Re: ${encodeURIComponent(subject)}`, label: "Reply via Email" })}
  `;

  return {
    subject: `[Website Inquiry] ${subject} — from ${name}`,
    html: emailWrapper({
      heading: "Customer Inquiry",
      subheading: `From ${name} (${email})`,
      content,
    }),
    text: `New website inquiry from ${name} (${email}):\nSubject: ${subject}\n\n${message}`,
  };
}
