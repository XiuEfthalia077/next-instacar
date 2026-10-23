/**
 * Booking transactional e-mails.
 *
 * These are the exact templates the legacy handlers in
 * `pages/admin/process/booking_actions.php` sent through PHPMailer
 * (`config/send_email.php`): a dark card with the yellow ( `#ffcc00` ) header.
 */

function shell(options: {
  heading: string;
  body: string;
  headingSize?: string;
}): string {
  const size = options.headingSize ?? "28px";

  return `
  <div style="max-width:600px; margin:20px auto; font-family: 'Poppins', sans-serif, Arial; background-color: #121212; border-radius:20px; overflow:hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #333;">
    <div style="background: #ffcc00; padding:40px; text-align:center;">
      <h1 style="margin:0; font-size:${size}; color:#000000; text-transform:uppercase; letter-spacing:2px; font-weight:800;">
        ${options.heading}
      </h1>
    </div>
    <div style="padding:40px; color:#ffffff; line-height:1.6;">
      ${options.body}
      <hr style="border:0; border-top:1px solid #333; margin:30px 0;">
      <div style="text-align:center;">
        <p style="font-size:12px; color:#666; margin-bottom:5px;">Thank you for choosing InstaCar!</p>
        <p style="font-size:10px; color:#444; text-transform:uppercase;">&copy; ${new Date().getFullYear()} InstaCar Rental Service</p>
      </div>
    </div>
  </div>`;
}

function button(href: string, label: string, outline = false): string {
  const style = outline
    ? "display:inline-block; border:2px solid #ffcc00; color:#ffcc00; padding:12px 30px; text-decoration:none; border-radius:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px;"
    : "display:inline-block; background:#ffcc00; color:#000000; padding:15px 35px; text-decoration:none; border-radius:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px;";

  return `<div style="text-align:center; margin:40px 0;"><a href="${href}" style="${style}">${label}</a></div>`;
}

export function bookingConfirmedEmail(name: string, dashboardUrl: string) {
  return {
    subject: "Booking Confirmed - InstaCar",
    html: shell({
      heading: "Booking Confirmed!",
      body: `
        <p style="font-size:18px;">Hello <strong>${name}</strong>,</p>
        <p style="color:#bbb;">Great news! Your booking has been successfully confirmed. Our team is already preparing your vehicle to ensure it is cleaned, fueled, and ready for your schedule.</p>
        <div style="background:#1e1e1e; border:1px solid #ffcc00; padding:20px; border-radius:10px; margin:25px 0; text-align:center;">
          <p style="margin:0; color:#ffcc00; font-weight:bold; text-transform:uppercase; font-size:12px; letter-spacing:1px;">Current Status</p>
          <p style="margin:0; font-size:18px; font-weight:bold; color:#ffffff;">Ready for Pickup</p>
        </div>
        <p style="color:#bbb;">You can view your full booking details, check pickup locations, and manage your trip anytime from your dashboard.</p>
        ${button(dashboardUrl, "Go to Dashboard")}`,
    }),
  };
}

export function vehicleReleasedEmail(name: string, dashboardUrl: string) {
  return {
    subject: "Vehicle Released - InstaCar",
    html: shell({
      heading: "Vehicle Released!",
      body: `
        <p style="font-size:18px;">Hello <strong>${name}</strong>,</p>
        <p style="color:#bbb;">Your vehicle has been released and is officially on the road. Drive safely and enjoy your journey!</p>
        ${button(dashboardUrl, "Go to Dashboard")}`,
    }),
  };
}

export function tripCompletedEmail(name: string, reviewUrl: string) {
  return {
    subject: `How was your ride, ${name}?`,
    html: shell({
      heading: "Trip Completed!",
      body: `
        <p style="font-size:18px;">Hello <strong>${name}</strong>,</p>
        <p style="color:#bbb;">Thanks for riding with <strong>Insta<span style="color:#ffcc00;">Car</span></strong>! We hope you enjoyed the journey. Your feedback helps us keep our fleet top-notch.</p>
        <p style="color:#bbb;">Could you spare a moment to rate your experience?</p>
        ${button(reviewUrl, "Leave a Review")}`,
    }),
  };
}

export function bookingCancelledEmail(name: string, dashboardUrl: string) {
  return {
    subject: "Booking Cancellation Notice - InstaCar",
    html: shell({
      heading: "Booking Cancelled",
      headingSize: "24px",
      body: `
        <p style="font-size:18px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#bbb;">This email confirms that your booking has been cancelled. As per our policy, a cancellation fee has been processed.</p>
        <div style="background:#1e1e1e; border-left:4px solid #ffcc00; padding:20px; margin:25px 0;">
          <p style="margin:0; color:#ffcc00; font-weight:bold; text-transform:uppercase; font-size:12px;">Cancellation Fee</p>
          <p style="margin:0; font-size:22px; font-weight:bold; color:#ffffff;">&#8369;500.00</p>
        </div>
        <p style="color:#bbb;">If you have any questions regarding this charge or would like to book a different vehicle, please visit your dashboard or contact our support team.</p>
        ${button(dashboardUrl, "View Dashboard", true)}`,
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
