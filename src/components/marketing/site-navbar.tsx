"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * Marketing navbar — port of the `<nav class="navbar">` block of
 * `car-rental/index.php`.
 *
 * Legacy look: sticky, `rgba(10,10,10,.95)` with a 12px backdrop blur and a
 * 1px `rgba(255,204,0,.15)` bottom border. The brand uses the gradient text
 * fill (`#fff` -> `#ffcc00`), the links are `#ddd` and turn yellow on hover.
 */
export function SiteNavbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "How It Works", href: "#features" },
    { label: "Our Fleet", href: "#fleet" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[#ffcc00]/15 bg-[#0a0a0a]/95 backdrop-blur-[12px]">
      <div className="mx-auto w-full max-w-[1320px] px-3 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="brand-gradient-text text-[1.9rem] font-extrabold tracking-[-1px]"
          >
            Insta<span className="text-[#ffcc00]">Car</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="border-0 bg-transparent p-1 text-white lg:hidden"
          >
            {open ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
          </button>

          <div
            className={`${open ? "block" : "hidden"} absolute inset-x-0 top-full border-b border-[#ffcc00]/15 bg-[#0a0a0a]/98 px-3 pb-4 pt-2 lg:static lg:block lg:border-0 lg:bg-transparent lg:p-0`}
          >
            <ul className="flex flex-col items-start gap-2 lg:ms-auto lg:flex-row lg:items-center">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded px-2 py-1 font-medium text-[#dddddd] transition-colors hover:text-[#ffcc00]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="lg:ms-2">
                <Link
                  href="/register"
                  className="btn-primary-custom inline-block px-4 py-2 text-sm"
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
