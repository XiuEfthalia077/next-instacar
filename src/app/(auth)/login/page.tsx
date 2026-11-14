import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CarFront, CheckCircle2, ShieldCheck, Sparkles, Star } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | InstaCar",
  description: "Sign in to your InstaCar account to manage bookings, fleet schedules, and rentals.",
};

/**
 * Split-screen login page (Task 1.5):
 * Left: Visual brand showcase with vehicle graphics and trust badges.
 * Right: High-conversion login form with Email, Password, and Google OAuth.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-12 bg-background font-sans text-foreground">
      {/* ── Left Column: Visual Showcase (Hidden on Small Screens) ── */}
      <div className="relative hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between overflow-hidden bg-black p-8 lg:p-12 text-white border-r border-border/60">
        {/* Ambient Glow & Vehicle Backdrop */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,204,0,0.25), transparent 70%), linear-gradient(to bottom, transparent, rgba(0,0,0,0.85))",
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

        {/* Central Vehicle Presentation */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#ffcc00]/40 bg-[#ffcc00]/15 px-3.5 py-1 text-xs font-bold text-[#ffcc00] mb-4">
            <Sparkles className="size-3.5" />
            <span>Panay &amp; Iloilo Premier Car Rental</span>
          </div>

          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight leading-tight text-white mb-4">
            Fast, transparent, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffcc00] to-amber-200">
              effortless mobility.
            </span>
          </h2>

          <p className="text-sm lg:text-base text-gray-300 leading-relaxed mb-6">
            Access your personalized client dashboard, manage reservations, track live fleet schedules, and unlock seamless doorstep delivery.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#ffcc00] shrink-0" />
              <span>10h, 12h &amp; 24h Flexible Tiers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#ffcc00] shrink-0" />
              <span>Doorstep Delivery Across Iloilo</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#ffcc00] shrink-0" />
              <span>Thoroughly Pre-Inspected Fleet</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="size-4 text-[#ffcc00] shrink-0 fill-[#ffcc00]" />
              <span>4.6/5 Verified Customer Rating</span>
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

      {/* ── Right Column: Sign In Form ── */}
      <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
        {/* Mobile Header Branding (< md) */}
        <div className="mb-8 md:hidden text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#ffcc00] text-black font-black">
              <CarFront className="size-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">
              Insta<span className="text-[#ffcc00]">Car</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">Premier Car Rentals in Iloilo</p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your credentials to access your InstaCar dashboard.
            </p>
          </div>

          <Suspense fallback={<div className="h-72 flex items-center justify-center text-xs text-muted-foreground">Loading authentication form...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
