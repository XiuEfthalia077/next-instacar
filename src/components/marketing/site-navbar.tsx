"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/layout/topbar";
import { ROLE_HOME } from "@/lib/constants";
import type { AppSession } from "@/lib/types";

/**
 * SiteNavbar
 * Header Navigation supporting all viewports (Mobile/iPod, Tablet/iPad, Laptop, Desktop)
 * - Logo routes to Dashboard when authenticated, or / for public guests
 * - Responsive layout preventing cutoffs or overlapping on small screens
 */
export function SiteNavbar({ session }: { session?: AppSession | null }) {
  const isLoggedIn = !!session?.userId;
  const dashboardHref = session?.role ? ROLE_HOME[session.role] : "/user/dashboard";
  const roleLabel =
    session?.role === "admin"
      ? "Admin"
      : session?.role === "operator"
        ? "Operator"
        : session?.role === "staff"
          ? "Staff"
          : "Dashboard";

  return (
    <header className="sticky top-0 z-50 h-14 sm:h-16 border-b border-border/80 bg-background/95 text-foreground backdrop-blur-md transition-colors flex items-center w-full max-w-full overflow-hidden">
      <div className="mx-auto w-full max-w-[1320px] px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Brand Logo (Links to Dashboard when logged in, or / if public) */}
          <Link
            href={isLoggedIn ? dashboardHref : "/"}
            className="brand-gradient-text text-[1.15rem] sm:text-[1.6rem] font-black tracking-tight flex items-center gap-0.5 sm:gap-1 shrink-0 transition-opacity hover:opacity-90"
            title={isLoggedIn ? "Go to your dashboard" : "InstaCar Home"}
          >
            <span>Insta</span>
            <span className="text-[#ffcc00]">Car</span>
            <span className="size-1.5 rounded-full bg-[#ffcc00] inline-block mb-1" />
          </Link>

          {/* Right: Header Navigation Elements (Responsive across iPod/Mobile, Tablet, and Desktop) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Contact Us Link: visible on Tablet & Desktop (>= md), hidden on Mobile/iPod to prevent overflow */}
            <Link
              href="/#contact"
              className="hidden md:inline-flex text-xs sm:text-sm font-bold text-foreground/80 hover:text-[#ffcc00] transition-colors px-2 py-1.5 rounded-lg hover:bg-muted/50 whitespace-nowrap"
            >
              Contact Us
            </Link>

            {/* Theme Toggle (Light / Dark) */}
            <div className="flex items-center justify-center shrink-0">
              <ThemeToggle className="size-8 sm:size-10" />
            </div>

            {isLoggedIn ? (
              /* When Logged In: Direct Dashboard Access Button */
              <Link
                href={dashboardHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#ffcc00] px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-black shadow-md transition hover:bg-[#ffd633] active:scale-95 shrink-0 whitespace-nowrap"
              >
                <LayoutDashboard className="size-3.5 sm:size-4 shrink-0" />
                <span>{roleLabel}</span>
              </Link>
            ) : (
              /* When Guest / Public: Clean Sign In & Register Buttons */
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-foreground shadow-xs transition hover:border-[#ffcc00] hover:bg-muted active:scale-95 shrink-0 whitespace-nowrap"
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#ffcc00] px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-black shadow-md transition hover:bg-[#ffd633] hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap"
                >
                  <span>Register</span>
                  <span aria-hidden="true" className="hidden sm:inline">→</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
