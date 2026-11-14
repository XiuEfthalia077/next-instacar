import type { Metadata } from "next";
import Link from "next/link";
import { CarFront, CheckCircle2, ShieldCheck, Sparkles, Star, UserPlus } from "lucide-react";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an Account | InstaCar",
  description: "Sign up for an InstaCar account to easily book vehicles, manage reservations, and access premium rental benefits.",
};

/**
 * Split-screen register page (Task 1.6):
 * Left: Visual brand showcase with vehicle graphics, guarantees, and trust badges.
 * Right: High-conversion registration form with real-time password requirements, live email checking, and Google OAuth.
 */
export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-12 bg-background font-sans text-foreground">
      {/* ── Left Column: Visual Showcase (Hidden on Small Screens) ── */}
      <div className="relative hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between overflow-hidden bg-black p-8 lg:p-12 text-white border-r border-border/60">
        {/* Ambient Glow & Backdrop */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, rgba(255,204,0,0.22), transparent 70%), linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))",
          }}
        />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#ffcc00] text-black font-black shadow-md group-hover:scale-105 transition-transform">
              <CarFront className="size-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Insta<span className="text-[#ffcc00]">Car</span>
            </span>
          </Link>
        </div>

        {/* Central Presentation */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ffcc00]/40 bg-[#ffcc00]/15 px-3.5 py-1 text-xs font-bold text-[#ffcc00] mb-4">
            <Sparkles className="size-3.5" />
            <span>Join InstaCar Member Benefits</span>
          </div>

          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight leading-tight text-white mb-4">
            Your journey starts <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-amber-200">
              with zero complications.
            </span>
          </h2>

          <p className="text-sm lg:text-base text-gray-300 leading-relaxed mb-6">
            Register your account in seconds to unlock express online reservations, view real-time fleet schedules, and save your preferred delivery hubs.
          </p>

          <div className="grid grid-cols-2 gap-3.5 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#ffcc00] shrink-0" />
              <span>Instant Online Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#ffcc00] shrink-0" />
              <span>Direct Doorstep Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#ffcc00] shrink-0" />
              <span>Zero Hidden Fees or Surprise Charges</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="size-4 text-[#ffcc00] shrink-0 fill-[#ffcc00]" />
              <span>24/7 Verified Roadside Support</span>
            </div>
          </div>
        </div>

        {/* Bottom Micro Footer */}
        <div className="relative z-10 text-xs text-gray-400 flex items-center justify-between">
          <p>&copy; 2026 InstaCar Rental Services. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </div>
      </div>

      {/* ── Right Column: Registration Form ── */}
      <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 overflow-y-auto">
        {/* Mobile Header Branding (< md) */}
        <div className="mb-6 md:hidden text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#ffcc00] text-black font-black">
              <CarFront className="size-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">
              Insta<span className="text-[#ffcc00]">Car</span>
            </span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-[#ffcc00]">
              <UserPlus className="size-3.5" />
              <span>Create Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Get started with InstaCar
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Create your account in under a minute or continue as a guest.
            </p>
          </div>

          {/* Registration Form Component */}
          <RegisterForm />

          {/* Alternate Link */}
          <p className="text-center text-xs text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-amber-700 hover:text-amber-600 dark:text-[#ffcc00] dark:hover:text-[#ffd633] underline transition"
            >
              Sign in &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
