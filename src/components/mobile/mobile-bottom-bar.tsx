"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Car,
  Heart,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { useFavorites } from "@/lib/hooks/use-favorites";
import { FavoritesSheet } from "@/components/mobile/favorites-sheet";
import { MobileSearchSheet } from "@/components/mobile/mobile-search-sheet";
import { cn } from "@/lib/utils";

/**
 * Mobile Bottom Navigation Bar (App Experience).
 * Provides 5 native-app style bottom tabs with active dot indicators,
 * search bottom sheet, and favorites wishlist.
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  const { count: favoritesCount } = useFavorites();

  const [searchOpen, setSearchOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  // Hide bottom bar on admin, staff, and operator portal routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/operator")
  ) {
    return null;
  }

  const isHomeActive = pathname === "/" || pathname === "/user/cars";
  const isTripsActive = pathname.startsWith("/user/mybookings");
  const isProfileActive =
    pathname.startsWith("/user/dashboard") ||
    pathname.startsWith("/user/profile") ||
    pathname.startsWith("/login");

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/90 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md transition-all md:hidden"
      >
        {/* 1. Explore / Home */}
        <Link
          href="/user/cars"
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
            isHomeActive
              ? "font-black text-[#ffcc00]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Car className={cn("size-5", isHomeActive ? "stroke-[2.5]" : "stroke-2")} />
          <span className="text-[10px] tracking-tight">Explore</span>
          {isHomeActive && (
            <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
          )}
        </Link>

        {/* 2. Search / Filters */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-center text-muted-foreground transition-colors hover:text-foreground min-w-[56px] min-h-[44px] cursor-pointer"
        >
          <SlidersHorizontal className="size-5 stroke-2" />
          <span className="text-[10px] tracking-tight">Search</span>
        </button>

        {/* 3. Saved / Favorites */}
        <button
          type="button"
          onClick={() => setFavoritesOpen(true)}
          className="relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-center text-muted-foreground transition-colors hover:text-foreground min-w-[56px] min-h-[44px] cursor-pointer"
        >
          <div className="relative">
            <Heart className="size-5 stroke-2" />
            {favoritesCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                {favoritesCount > 9 ? "9+" : favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Saved</span>
        </button>

        {/* 4. My Trips / Bookings */}
        <Link
          href="/user/mybookings"
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
            isTripsActive
              ? "font-black text-[#ffcc00]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className={cn("size-5", isTripsActive ? "stroke-[2.5]" : "stroke-2")} />
          <span className="text-[10px] tracking-tight">Trips</span>
          {isTripsActive && (
            <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
          )}
        </Link>

        {/* 5. Profile / Account */}
        <Link
          href="/user/dashboard"
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 px-3 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
            isProfileActive
              ? "font-black text-[#ffcc00]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className={cn("size-5", isProfileActive ? "stroke-[2.5]" : "stroke-2")} />
          <span className="text-[10px] tracking-tight">Profile</span>
          {isProfileActive && (
            <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
          )}
        </Link>
      </nav>

      {/* Mobile Search Bottom Sheet */}
      <MobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Saved / Favorites Bottom Sheet */}
      <FavoritesSheet open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </>
  );
}
