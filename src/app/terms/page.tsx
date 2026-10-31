import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CarFront, FileText, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | InstaCar",
  description: "Terms and conditions governing the rental and reservation of vehicles with InstaCar.",
};

export default function TermsPage() {
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
              href="/privacy"
              className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
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
            <span>Legal Compliance &bull; Version 1.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Effective Date: October 31, 2026 &bull; Last Updated: Version 1.0
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">1.</span> Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering an account, or reserving any vehicle through the InstaCar platform
              (including our web portal, mobile interfaces, and walk-in reservation counters), you agree to be bound
              by these Terms of Service (&ldquo;Terms&rdquo;) and all incorporated guidelines, including our Privacy Policy.
              If you do not agree to these Terms, you may not register, access, or utilize our car rental services.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">2.</span> Driver Eligibility &amp; Verification
            </h2>
            <p>
              To rent and drive an InstaCar vehicle, renters must fulfill the following criteria:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Be at least twenty-one (21) years of age with a valid government-issued driver&apos;s license.</li>
              <li>Provide two (2) verified identification documents: one (1) primary government ID (e.g., Driver&apos;s License) and one (1) secondary verification document (e.g., Proof of Billing).</li>
              <li>Foreign nationals must present a valid passport and international driving permit or endorsed home country license compliant with Philippine Land Transportation regulations.</li>
              <li>Maintain an active, verified InstaCar account in good standing.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">3.</span> Rental Tiers, Schedules &amp; Return Policies
            </h2>
            <p>
              InstaCar offers flexible rental tiers:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Tier Schedules:</strong> Rentals may be booked for 10-Hour, 12-Hour, or 24-Hour standard blocks, with automated extension rates calculated as specified in each vehicle&apos;s rate card.</li>
              <li><strong>Pickup &amp; Delivery:</strong> Vehicles may be collected at our branch hubs (e.g., Pavia, Iloilo) or dispatched via designated doorstep delivery for which applicable delivery fees apply.</li>
              <li><strong>Late Return Penalties:</strong> Failure to return the vehicle within one (1) hour of the scheduled return time without prior authorized extension will incur overtime charges and late penalties. Overdue unreturned vehicles exceeding 24 hours are reported to law enforcement authorities.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">4.</span> Security Deposits, Rates &amp; Payment
            </h2>
            <p>
              All rental rates are quoted in Philippine Pesos (PHP). A down payment or security deposit may be required
              upon reservation confirmation. Down payments are applied toward the gross rental fee. Outstanding balances
              must be settled upon vehicle release. Security deposits are refundable upon post-rental inspection, subject
              to deductions for fuel discrepancies, traffic citations, or minor damages.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">5.</span> Prohibited Use of Vehicles
            </h2>
            <p>
              Renters agree that vehicles will strictly NOT be used for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Operation by any driver not listed or authorized in the booking agreement.</li>
              <li>Driving under the influence of alcohol, drugs, or intoxicating substances.</li>
              <li>Subleasing, commercial hauling beyond designated payload capacity, or peer-to-peer sharing.</li>
              <li>Participation in speed contests, races, illegal activities, or off-road navigation in unpaved hazardous terrains.</li>
              <li>Smoking or vaping inside vehicles, which incurs a standard deep-cleaning fee.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">6.</span> Maintenance, Accidents &amp; Liability
            </h2>
            <p>
              InstaCar inspects all fleet vehicles to ensure roadworthiness before release. In the event of mechanical
              breakdown, puncture, or traffic collision, the renter must immediately contact our 24/7 hotline and furnish
              a police report where applicable. Renter is liable for repair costs resulting from negligence, reckless
              driving, or violation of traffic laws.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-[#ffcc00]">7.</span> Amendments &amp; Contact Information
            </h2>
            <p>
              InstaCar reserves the right to modify these Terms periodically. Notice of material revisions will be
              communicated through the platform, requiring renewed consent upon sign-in. For questions regarding
              these Terms, please contact our support team at{" "}
              <a href="mailto:support@instacar.ph" className="text-[#ffcc00] hover:underline font-semibold">
                support@instacar.ph
              </a>
              .
            </p>
          </section>
        </div>

        {/* Bottom Navigation Actions */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy &rarr;
            </Link>
            <Link
              href="/login"
              className="font-bold text-[#ffcc00] hover:underline"
            >
              Sign In to Account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
