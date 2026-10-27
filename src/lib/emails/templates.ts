/**
 * HTML Email Templates for InstaCar.
 *
 * Professional, brand-aligned (Yellow #ffcc00 on Dark #121212 / #1e1e1e)
 * responsive transactional templates with plain-text versions.
 */

function emailWrapper({
  heading,
  subheading,
  content,
}: {
  heading: string;
  subheading?: string;
  content: string;
}): string {
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <div style="max-width: 620px; margin: 30px auto; background-color: #161616; border-radius: 18px; overflow: hidden; border: 1px solid #282828; box-shadow: 0 12px 35px rgba(0,0,0,0.6);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ffcc00 0%, #e6b800 100%); padding: 36px 30px; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #1a1a1a;">
        INSTACAR RENTAL SERVICE
      </p>
      <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 1px;">
        ${heading}
      </h1>
      ${
        subheading
          ? `<p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600; color: #333333;">${subheading}</p>`
          : ""
      }
    </div>

    <!-- Body Content -->
    <div style="padding: 36px 32px; line-height: 1.6; color: #e5e5e5; font-size: 15px;">
      ${content}

      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #282828; text-align: center; font-size: 12px; color: #777777;">
        <p style="margin: 0 0 6px 0;">Need immediate assistance? Contact our 24/7 hotline at <strong style="color: #ffcc00;">+63 (917) 000-0000</strong></p>
        <p style="margin: 0; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px;">
          &copy; ${year} InstaCar Philippines. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

function button({ href, label }: { href: string; label: string }): string {
  return `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${href}" style="display: inline-block; background-color: #ffcc00; color: #000000; font-weight: 800; font-size: 14px; padding: 14px 34px; border-radius: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(255, 204, 0, 0.3);">
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
    <p style="font-size: 18px; margin-top: 0;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc;">
      Welcome to <strong>InstaCar</strong>! We are thrilled to have you join our premier vehicle rental network. Whether you are traveling for business, planning a family getaway, or exploring the islands, we have the ideal ride ready for you.
    </p>

    <div style="background-color: #1f1f1f; border-left: 4px solid #ffcc00; border-radius: 8px; padding: 20px; margin: 26px 0;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #ffcc00; font-weight: 800; text-transform: uppercase;">
        What you can do right now:
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #dddddd; font-size: 14px;">
        <li style="margin-bottom: 8px;"><strong>Browse Diverse Fleet:</strong> Sedans, SUVs, MPVs, and premium vans.</li>
        <li style="margin-bottom: 8px;"><strong>Flexible Rentals:</strong> Hourly, daily, and long-term self-drive or with driver.</li>
        <li style="margin-bottom: 8px;"><strong>Fast Bookings:</strong> Instant online checkout and reservation tracking.</li>
        <li><strong>24/7 Road Support:</strong> Cleaned, inspected, and fully insured vehicles.</li>
      </ul>
    </div>

    <p style="color: #cccccc;">
      Click the button below to sign in to your dashboard, manage your profile, and rent your first vehicle.
    </p>

    ${button({ href: loginUrl, label: "Explore Vehicles & Book" })}
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
    <p style="font-size: 18px; margin-top: 0;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc;">
      Thank you for choosing InstaCar! We have successfully received your booking. Here are your reservation details:
    </p>

    <div style="background-color: #1e1e1e; border: 1px solid #333333; border-radius: 12px; padding: 22px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #2e2e2e; padding-bottom: 12px; margin-bottom: 12px;">
        <span style="color: #888888; font-size: 13px; text-transform: uppercase;">Booking Reference</span>
        <span style="color: #ffcc00; font-weight: 800; font-size: 15px;">#${refCode}</span>
      </div>

      <div style="margin-bottom: 10px;">
        <span style="color: #888888; font-size: 13px;">Selected Vehicle:</span>
        <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 2px;">${carName}</div>
      </div>

      <div style="margin-bottom: 10px;">
        <span style="color: #888888; font-size: 13px;">Pickup Schedule:</span>
        <div style="color: #ffffff; font-weight: 600; margin-top: 2px;">${startDate} &bull; ${pickupTime}</div>
      </div>

      <div style="margin-bottom: 10px;">
        <span style="color: #888888; font-size: 13px;">Return Schedule:</span>
        <div style="color: #ffffff; font-weight: 600; margin-top: 2px;">${endDate} &bull; ${returnTime}</div>
      </div>

      <div style="margin-bottom: 10px;">
        <span style="color: #888888; font-size: 13px;">Fulfillment Type:</span>
        <div style="color: #ffffff; font-weight: 600; margin-top: 2px;">${fulfillmentType || "Pickup"}</div>
      </div>

      ${
        deliveryAddress
          ? `
      <div style="margin-bottom: 10px;">
        <span style="color: #888888; font-size: 13px;">Delivery Location:</span>
        <div style="color: #ffffff; font-weight: 600; margin-top: 2px;">${deliveryAddress}</div>
      </div>
      `
          : ""
      }

      <div style="border-top: 1px solid #2e2e2e; padding-top: 14px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #ffffff; font-size: 15px; font-weight: 700;">Total Amount:</span>
        <span style="color: #ffcc00; font-size: 20px; font-weight: 900;">&#8369;${formattedTotal}</span>
      </div>
    </div>

    <p style="color: #cccccc; font-size: 14px;">
      Our team is currently reviewing your documents and preparing the vehicle. You can monitor your booking status and upload any additional requirements from your portal.
    </p>

    ${button({ href: dashboardUrl, label: "Track Booking Details" })}
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
    <p style="font-size: 18px; margin-top: 0;">Admin Dispatch Notification</p>
    <p style="color: #cccccc;">
      A new <strong>${bookingType.toUpperCase()}</strong> booking has been created in the InstaCar platform.
    </p>

    <div style="background-color: #1e1e1e; border: 1px solid #333333; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Booking Ref:</strong> #${refCode}</p>
      <p style="margin: 0 0 8px 0;"><strong>Customer Name:</strong> ${customerName}</p>
      ${customerEmail ? `<p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${customerEmail}</p>` : ""}
      ${customerPhone ? `<p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${customerPhone}</p>` : ""}
      <p style="margin: 0 0 8px 0;"><strong>Car:</strong> ${carName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Schedule:</strong> ${startDate} to ${endDate}</p>
      <p style="margin: 0;"><strong>Total Price:</strong> &#8369;${formattedTotal}</p>
    </div>

    ${button({ href: adminUrl, label: "View in Admin Dashboard" })}
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
  const greeting = name ? `Hello <strong>${name}</strong>,` : "Hello,";

  const content = `
    <p style="font-size: 18px; margin-top: 0;">${greeting}</p>
    <p style="color: #cccccc;">
      We received a request to reset your InstaCar account password. Use the 6-digit verification code below to complete the reset process:
    </p>

    <div style="background-color: #0d0d0d; border: 2px dashed #ffcc00; border-radius: 14px; padding: 24px; margin: 30px 0; text-align: center;">
      <span style="font-size: 13px; font-weight: 700; color: #888888; text-transform: uppercase; letter-spacing: 2px;">
        Your One-Time Passcode (OTP)
      </span>
      <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ffcc00; margin: 12px 0; font-family: monospace;">
        ${otp}
      </div>
      <span style="font-size: 12px; color: #aaaaaa;">
        Valid for <strong style="color: #ffffff;">${expiresInMinutes} minutes</strong>
      </span>
    </div>

    <div style="background-color: #1a1a1a; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 18px; margin: 24px 0;">
      <p style="margin: 0; font-size: 13px; color: #fca5a5;">
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
    <p style="font-size: 18px; margin-top: 0;">Hello <strong style="color: #ffffff;">${safeName}</strong>,</p>
    <p style="color: #cccccc;">
      Thank you for reaching out to InstaCar Philippines! We have received your inquiry regarding <strong>"${subject}"</strong>.
    </p>

    <div style="background-color: #1e1e1e; border: 1px solid #333333; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <span style="color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700;">Summary of your message:</span>
      <p style="color: #dddddd; font-style: italic; margin: 10px 0 0 0; line-height: 1.5; font-size: 14px;">
        &ldquo;${message}&rdquo;
      </p>
    </div>

    <p style="color: #cccccc; font-size: 14px;">
      Our support team typically responds within <strong>2 to 4 business hours</strong> (8:00 AM – 8:00 PM PHT). For urgent dispatch requests, feel free to call our direct line at +63 (917) 000-0000.
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
    <p style="font-size: 18px; margin-top: 0;">New Website Inquiry</p>
    <p style="color: #cccccc;">
      A customer has submitted a new inquiry through the landing page contact form.
    </p>

    <div style="background-color: #1e1e1e; border: 1px solid #333333; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Sender Name:</strong> ${name}</p>
      <p style="margin: 0 0 10px 0;"><strong>Sender Email:</strong> <a href="mailto:${email}" style="color: #ffcc00;">${email}</a></p>
      <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
      <p style="margin: 0 0 10px 0;"><strong>Received At:</strong> ${createdAt}</p>
      <hr style="border: 0; border-top: 1px solid #333333; margin: 15px 0;">
      <p style="margin: 0 0 6px 0; color: #888888; font-size: 12px; text-transform: uppercase; font-weight: 700;">Message Content:</p>
      <div style="background-color: #121212; padding: 14px; border-radius: 8px; color: #ffffff; font-size: 14px; white-space: pre-wrap;">
        ${message}
      </div>
    </div>
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
