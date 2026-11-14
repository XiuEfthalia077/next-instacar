"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/topbar";

/**
 * SiteNavbar — Task 1.1
 * Header Navigation strictly containing:
 * - Brand Logo (left)
 * - "Contact Us"
 * - Theme Toggle
 * - "Sign In"
 * - "Register" (prominently styled as a yellow button)
 *
 * Designed with full Light Mode and Dark Mode support and responsive
 * layouts for Mobile (<640px), Tablet (768px), Laptop (1024px), and Desktop (1280px+).
 */
export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border/80 bg-background/95 text-foreground backdrop-blur-md transition-colors flex items-center">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Crisp Brand Logo */}
          <Link
            href="/"
            className="brand-gradient-text text-[1.5rem] sm:text-[1.85rem] font-black tracking-[-1px] flex items-center gap-1 shrink-0"
          >
            <span>Insta</span>
            <span className="text-[#ffcc00]">Car</span>
            <span className="size-1.5 rounded-full bg-[#ffcc00] inline-block mb-1" />
          </Link>

          {/* Right: Header Navigation Elements (Desktop, Tablet & Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Contact Us Link */}
            <Link
              href="/#contact"
              className="text-xs sm:text-sm font-bold text-foreground/80 hover:text-[#ffcc00] transition-colors px-2 py-1.5 rounded-lg hover:bg-muted/50"
            >
              Contact Us
            </Link>

            {/* Theme Toggle (Light / Dark) */}
            <div className="flex items-center justify-center">
              <ThemeToggle />
            </div>

            {/* Sign In */}
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-foreground shadow-xs transition hover:border-[#ffcc00] hover:bg-muted active:scale-95"
            >
              Sign In
            </Link>

            {/* Register (Styled as a bold yellow button) */}
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#ffcc00] px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-black shadow-md transition hover:bg-[#ffd633] hover:scale-[1.02] active:scale-95 shrink-0"
            >
              <span>Register</span>
              <span aria-hidden="true" className="hidden sm:inline">→</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
