import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CarFront, Lock, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | InstaCar",
  description: "Privacy policy and personal data processing practices for InstaCar car rental services.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#ffcc00] selection:text-black">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-black text-base text-foreground transition-opacity hover:opacity-80"
          >
            <CarFront className="size-6 text-[#ffcc00]" />
            <span>
              Insta<span className="text-[#ffcc00]">Car</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/terms"
              className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#ffcc00] px-3 py-1.5 font-bold text-black hover:bg-[#e6b800] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffcc00] mb-2">
            <ShieldCheck className="size-4" />
            <span>Data Privacy &bull; Version 1.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Effective Date: October 31, 2026 &bull; Last Updated: Version 1.0 &bull; RA 10173 (Data Privacy Act of 2012) Compliant
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">1.</span> Introduction &amp; Commitment
            </h2>
            <p>
              InstaCar (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is dedicated to protecting the privacy,
              confidentiality, and integrity of your personal information. This Privacy Policy describes how we collect,
              record, organize, store, update, use, and dispose of your personal data when you use the InstaCar website,
              mobile application, reservation portal, and branch facilities, in compliance with Republic Act No. 10173,
              also known as the Philippine Data Privacy Act of 2012 (DPA).
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">2.</span> Information We Collect
            </h2>
            <p>
              We collect only the personal information reasonably necessary to verify your identity, administer vehicle
              rentals, process financial transactions, and maintain vehicle safety:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Identity &amp; Contact Data:</strong> Full name, email address, mobile phone number, physical residential address, and profile photo (if provided via Google OAuth).
              </li>
              <li>
                <strong>Verification Documents:</strong> Scanned copies or photographs of government-issued driver&apos;s licenses, primary identity documents (Passport, UMID, Postal ID), and secondary proof of billing documents.
              </li>
              <li>
                <strong>Booking &amp; Transaction Data:</strong> Rental start/end schedules, pickup/return locations, vehicle tier selection, payment method, down payments, balances, and security deposit records.
              </li>
              <li>
                <strong>Telematics &amp; Fleet Data:</strong> Real-time GPS location, odometer readings, and vehicle diagnostic telemetry collected strictly during the active rental window for fleet safety and recovery.
              </li>
              <li>
                <strong>Technical Information:</strong> Device identifiers, IP addresses, browser types, and session authentication tokens required to deliver secure cloud access.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">3.</span> Legal Basis &amp; Purpose of Processing
            </h2>
            <p>
              We process your personal information under the following lawful bases:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Performance of Contract:</strong> Fulfilling rental bookings, delivering vehicles, processing payments, and verifying driver credentials prior to handoff.
              </li>
              <li>
                <strong>Legal &amp; Regulatory Obligations:</strong> Compliance with Land Transportation Office (LTO) mandates, commercial transportation laws, and lawful law enforcement requests.
              </li>
              <li>
                <strong>Legitimate Interests:</strong> Protecting our automotive fleet from theft, damage, or unauthorized cross-island border crossings, and safeguarding platform integrity.
              </li>
              <li>
                <strong>Consent:</strong> Sending voluntary promotional updates, surveys, or service announcements where you have opted in.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">4.</span> Disclosure &amp; Sharing of Information
            </h2>
            <p>
              InstaCar does not sell, rent, or trade your personal data to third parties for marketing purposes. We share data only with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Authorized Infrastructure Providers:</strong> Cloud database, storage, and authentication services (Supabase Inc.) hosted under industry-standard encryption protocols.
              </li>
              <li>
                <strong>Identity &amp; OAuth Providers:</strong> Google LLC for streamlined single sign-on authentication where initiated by the user.
              </li>
              <li>
                <strong>Law Enforcement &amp; Legal Authorities:</strong> If a rental vehicle is unreturned exceeding 24 hours without authorization, reported stolen, or involved in a vehicular incident.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">5.</span> Data Storage, Retention &amp; Security
            </h2>
            <p>
              Your data is stored in secured, access-restricted cloud environments utilizing AES-256 encryption at rest and TLS 1.3 encryption in transit. Identity documents submitted for verification are purged or anonymized in accordance with our document retention schedule once statutory and audit retention obligations expire.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">6.</span> Your Data Subject Rights
            </h2>
            <p>
              Under Chapter IV of the Philippine Data Privacy Act of 2012, you possess the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Be informed whether your personal data is being processed.</li>
              <li>Reasonably access your personal data on file.</li>
              <li>Dispute inaccuracy or error in your personal data and require rectification.</li>
              <li>Suspend, withdraw, or order the blocking, removal, or destruction of your personal data from our systems upon settlement of active rental contracts.</li>
              <li>Lodge a complaint before the National Privacy Commission (NPC) if your privacy rights have been violated.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">7.</span> Cookies &amp; Session Tracking
            </h2>
            <p>
              We use strictly necessary cookies and local storage tokens to maintain authenticated sessions, secure CSRF protection, and retain user theme preferences. We do not use third-party behavioral advertising trackers.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">8.</span> Contact Our Data Protection Officer
            </h2>
            <p>
              For inquiries regarding this Privacy Policy, requests to exercise your data subject rights, or privacy concerns, please contact our Data Protection Officer:
            </p>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-foreground">
              <p className="font-bold">InstaCar Data Privacy Office</p>
              <p className="text-xs text-muted-foreground">Address: Pandac, Pavia, Iloilo 5001, Philippines</p>
              <p className="text-xs text-muted-foreground">Email: privacy@instacar.ph &bull; support@instacar.ph</p>
            </div>
          </section>
        </div>

        {/* Bottom Back Action */}
        <div className="mt-12 border-t border-border pt-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Home</span>
          </Link>
          <Link
            href="/terms"
            className="text-xs font-semibold text-[#ffcc00] hover:underline"
          >
            View Terms of Service &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
