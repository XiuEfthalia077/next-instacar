"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, User, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/layout/topbar";
import { MobileSearchSheet } from "@/components/mobile/mobile-search-sheet";

export function SiteNavbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  const links = [
    { label: "Services", href: "#features" },
    { label: "Our Fleet", href: "#fleet" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 h-14 sm:h-16 border-b border-border/80 bg-background/90 text-foreground backdrop-blur-md transition-colors flex items-center">
        <div className="mx-auto w-full max-w-[1320px] px-4">
          <div className="flex items-center justify-between">
            {/* Left: Crisp Brand Logo */}
            <Link
              href="/"
              className="brand-gradient-text text-[1.6rem] sm:text-[1.85rem] font-black tracking-[-1px] flex items-center gap-1"
            >
              <span>Insta</span>
              <span className="text-[#ffcc00]">Car</span>
              <span className="size-1.5 rounded-full bg-[#ffcc00] inline-block mb-1" />
            </Link>

            {/* Mobile Header Actions (Inspired by modern native apps) */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden">
              {/* Search Shortcut Icon */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search vehicles"
                className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs cursor-pointer min-h-[40px] min-w-[40px]"
              >
                <Search className="size-4.5 stroke-[2.2]" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Profile / Sign In Shortcut */}
              <Link
                href="/login"
                aria-label="User account or sign in"
                className="flex size-10 items-center justify-center rounded-full bg-[#ffcc00] text-black hover:bg-[#ffd633] active:scale-95 transition-all shadow-xs cursor-pointer min-h-[40px] min-w-[40px]"
              >
                <User className="size-4.5 stroke-[2.5]" />
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex lg:items-center lg:gap-6">
              <ul className="flex items-center gap-6">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-sm font-bold text-muted-foreground transition-colors hover:text-[#ffcc00]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2.5 pl-2 border-l border-border/70">
                <ThemeToggle />

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground transition hover:border-[#ffcc00]"
                >
                  Sign In
                </Link>

                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#ffcc00] px-4 py-2 text-xs sm:text-sm font-extrabold text-black shadow-sm transition hover:bg-[#ffd633]"
                >
                  <span>Register</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Bottom Sheet */}
      <MobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
