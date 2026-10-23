import Link from "next/link";
import { CalendarCheck, Car } from "lucide-react";

/**
 * Hero section — port of the `<section class="hero">` block of
 * `car-rental/index.php`.
 *
 * Legacy background:
 *   radial-gradient(circle at 80% 20%, rgba(255,204,0,.08), transparent 70%),
 *   linear-gradient(145deg, #0a0a0a 0%, #121212 100%)
 */
export function Hero() {
  return (
    <section className="relative bg-[linear-gradient(145deg,#0a0a0a_0%,#121212_100%)] py-[70px] md:py-[90px] lg:py-[120px]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, rgba(255,204,0,0.08), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1320px] px-3">
        <div className="mx-auto max-w-[960px] text-center">
          <div className="mb-4 inline-flex">
            <span className="badge-promo inline-flex items-center gap-1 text-[#ffcc00]">
              <Car className="h-[1em] w-[1em]" aria-hidden />
              Fast Online Reservation &amp; Easy Fleet Access
            </span>
          </div>

          <h1 className="hero-title mb-4">
            Take the wheel with
            <br />
            <span className="hero-gradient-text">zero hassle.</span>
          </h1>

          <p className="mx-auto mb-5 max-w-3xl text-lg font-light leading-relaxed text-[#cbd5e1] opacity-75">
            Pick your vehicle, submit your booking, and get driving. Simple
            rates, well-maintained cars, and straightforward handoffs.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="btn-primary-custom inline-flex items-center gap-2 rounded-full px-5 py-3 text-base"
            >
              <CalendarCheck className="h-5 w-5" aria-hidden />
              Book Your Drive
            </Link>
            <a
              href="#fleet"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white px-5 py-3 text-base text-white transition-colors hover:bg-white hover:text-black"
            >
              <Car className="h-5 w-5" aria-hidden />
              Explore Fleet
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
