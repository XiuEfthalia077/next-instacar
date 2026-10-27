"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/layout/topbar";

export function SiteNavbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Services", href: "#features" },
    { label: "Our Fleet", href: "#fleet" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border/80 bg-background/90 text-foreground backdrop-blur-md transition-colors">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="brand-gradient-text text-[1.8rem] sm:text-[1.9rem] font-black tracking-[-1px]"
          >
            Insta<span className="text-[#ffcc00]">Car</span>
          </Link>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="Toggle navigation"
              aria-expanded={open}
              className="rounded-lg border border-border p-2 text-foreground hover:bg-muted"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>

          <div
            className={`${open ? "block" : "hidden"} absolute inset-x-0 top-full border-b border-border bg-background px-4 pb-4 pt-2 shadow-lg lg:static lg:block lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
          >
            <ul className="flex flex-col items-start gap-2 lg:ms-auto lg:flex-row lg:items-center">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 lg:hover:bg-transparent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="hidden lg:block lg:ms-2">
                <ThemeToggle />
              </li>
              <li className="mt-2 lg:mt-0 lg:ms-2 w-full lg:w-auto">
                <Link
                  href="/login"
                  className="inline-flex w-full lg:w-auto items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-bold text-foreground transition hover:border-[#ffcc00]"
                >
                  Sign In
                </Link>
              </li>
              <li className="w-full lg:w-auto lg:ms-1.5">
                <Link
                  href="/register"
                  className="inline-flex w-full lg:w-auto items-center justify-center rounded-xl bg-[#ffcc00] px-4 py-2 text-xs sm:text-sm font-extrabold text-black shadow-sm transition hover:bg-[#ffd633]"
                >
                  Register →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
