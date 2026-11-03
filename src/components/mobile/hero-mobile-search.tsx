"use client";

import { useState } from "react";
import { MobileSearchPill, MobileSearchSheet } from "@/components/mobile/mobile-search-sheet";

export function HeroMobileSearch() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 w-full max-w-md mx-auto md:hidden">
      <MobileSearchPill
        onClick={() => setOpen(true)}
        placeholder="Search destination or car model • Any dates • 2+ guests"
      />
      <MobileSearchSheet open={open} onOpenChange={setOpen} />
    </div>
  );
}
