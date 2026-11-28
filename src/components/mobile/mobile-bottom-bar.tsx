"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Car,
  ClipboardList,
  Heart,
  LayoutDashboard,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { useFavorites } from "@/lib/hooks/use-favorites";
import { FavoritesSheet } from "@/components/mobile/favorites-sheet";
import { MobileSearchSheet } from "@/components/mobile/mobile-search-sheet";
import { ProfileSheet, type MobileProfileUser } from "@/components/mobile/profile-sheet";
import { FleetSheet } from "@/components/mobile/fleet-sheet";
import { BookingsSheet } from "@/components/mobile/bookings-sheet";
import { MoreSheet } from "@/components/mobile/more-sheet";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Mobile Bottom Navigation Bar (Consolidated Native Experience).
 *
 * Requirements:
 * 1. Fixed at bottom on mobile screens (md:hidden).
 * 2. Hidden on Auth Pages (login, register, forgot/reset password, terms compliance).
 * 3. Only renders when a user is authenticated.
 * 4. User Side: [ Explore | Search | Saved | Trips | Profile ].
 * 5. Admin / Operator Side (Exactly 5 slots with Bookings in center):
 *    [ Dashboard ] [ Fleet (Sheet) ] [ Bookings (Center Link) ] [ More (Sheet) ] [ Profile (Sheet) ]
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  const { count: favoritesCount } = useFavorites();

  const [searchOpen, setSearchOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [fleetOpen, setFleetOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [sessionUser, setSessionUser] = useState<MobileProfileUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 1. Critical Guard: Always hide on auth and terms compliance routes
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/user/forgot") ||
    pathname.startsWith("/user/reset") ||
    pathname.startsWith("/accept-terms") ||
    pathname.startsWith("/auth/");

  const isPortalRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/operator") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/shared") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/profile");

  // 2. Resolve authentication and active user role whenever navigating across auth/portal boundaries
  useEffect(() => {
    if (isAuthRoute) {
      setIsAuthenticated(false);
      return;
    }

    if (isPortalRoute) {
      setIsAuthenticated(true);
    }

    let cancelled = false;
    const supabase = createClient();

    const syncUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !user) {
        if (!isPortalRoute) {
          setIsAuthenticated(false);
          setSessionUser(null);
        }
        return;
      }

      setIsAuthenticated(true);

      const { data: profile } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profile) {
        setSessionUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
        });
      } else {
        setSessionUser({
          id: user.id,
          name: user.user_metadata?.name || null,
          email: user.email || null,
          role: (user.user_metadata?.role as string) || "user",
        });
      }
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session) {
        if (!isPortalRoute) {
          setIsAuthenticated(false);
          setSessionUser(null);
        }
      } else {
        setIsAuthenticated(true);
        void syncUser();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isAuthRoute, isPortalRoute]);

  // If on auth route or definitely unauthenticated on non-portal route, do not render bottom navigation
  if (isAuthRoute || (!isPortalRoute && isAuthenticated === false)) {
    return null;
  }

  // Determine whether to show Admin/Operator navigation vs User navigation
  const isAdminOrOperator =
    sessionUser?.role === "admin" ||
    sessionUser?.role === "operator" ||
    sessionUser?.role === "staff" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/operator") ||
    pathname.startsWith("/staff") ||
    (pathname.startsWith("/shared") && sessionUser?.role !== "user");

  // Determine active route targets for Admin/Operator
  const role = sessionUser?.role || "admin";
  const dashboardHref =
    role === "operator"
      ? "/operator/dashboard"
      : role === "staff"
        ? "/staff/dashboard"
        : "/admin/dashboard";

  const bookingsHref =
    role === "operator"
      ? "/operator/bookings"
      : role === "staff"
        ? "/staff/bookings"
        : "/admin/bookings_online";

  const isDashboardActive =
    pathname === "/admin/dashboard" ||
    pathname === "/operator/dashboard" ||
    pathname === "/staff/dashboard" ||
    pathname === "/admin" ||
    pathname === "/operator" ||
    pathname === "/staff";

  const isFleetActive =
    pathname.startsWith("/shared/cars") ||
    pathname.startsWith("/operator/view_car") ||
    pathname.startsWith("/shared/my_car_schedules") ||
    pathname.startsWith("/admin/fleet");

  const isBookingsActive =
    pathname.startsWith("/operator/bookings") ||
    pathname.startsWith("/staff/bookings") ||
    pathname.startsWith("/admin/bookings") ||
    pathname.startsWith("/shared/booking_details") ||
    pathname.startsWith("/shared/calendar");

  // Determine active route targets for User
  const isExploreActive =
    pathname === "/" ||
    pathname.startsWith("/user/cars") ||
    pathname.startsWith("/availability") ||
    pathname.startsWith("/public/cars");
  const isTripsActive = pathname.startsWith("/user/mybookings");
  const isProfileActive =
    profileOpen ||
    pathname.startsWith("/user/profile") ||
    pathname.startsWith("/profile");

  // Active Tab Pill classes (High contrast in Light Mode & Glowing in Dark Mode)
  const activeTabClass =
    "bg-yellow-500/20 text-amber-950 dark:text-[#ffcc00] dark:bg-yellow-500/25 border border-yellow-500/40 font-black shadow-xs rounded-2xl";
  const inactiveTabClass = "text-muted-foreground hover:text-foreground";

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-1 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md transition-all md:hidden"
      >
        {isAdminOrOperator ? (
          /* =========================================================================
             ADMIN / OPERATOR / STAFF NAVIGATION TABS (EXACTLY 5 SLOTS)
             Layout: [ Dashboard ] [ Fleet ] [ Bookings (Center) ] [ More ] [ Profile ]
             ========================================================================= */
          <>
            {/* 1. Dashboard (Direct Link) */}
            <Link
              href={dashboardHref}
              prefetch={true}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 text-center transition-all min-w-[56px] min-h-[44px]",
                isDashboardActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <LayoutDashboard className={cn("size-5 shrink-0", isDashboardActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Dashboard</span>
            </Link>

            {/* 2. Fleet (Slide-Up Menu) */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setFleetOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 text-center transition-all min-w-[56px] min-h-[44px] cursor-pointer",
                fleetOpen || isFleetActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <Car className={cn("size-5 shrink-0", fleetOpen || isFleetActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Fleet</span>
            </button>

            {/* 3. Bookings (Center Slide-Up Menu) */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setBookingsOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px] cursor-pointer",
                bookingsOpen || isBookingsActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <ClipboardList className={cn("size-5 shrink-0", bookingsOpen || isBookingsActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Bookings</span>
            </button>

            {/* 4. More (Slide-Up Menu) */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setMoreOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 text-center transition-all min-w-[56px] min-h-[44px] cursor-pointer",
                moreOpen ? activeTabClass : inactiveTabClass,
              )}
            >
              <SlidersHorizontal className={cn("size-5 shrink-0", moreOpen ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">More</span>
            </button>

            {/* 5. Profile (Slide-Up Menu) */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setProfileOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 text-center transition-all min-w-[56px] min-h-[44px] cursor-pointer",
                profileOpen ? activeTabClass : inactiveTabClass,
              )}
            >
              <User className={cn("size-5 shrink-0", profileOpen ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Profile</span>
            </button>
          </>
        ) : (
          /* =========================================================================
             USER / CUSTOMER NAVIGATION TABS
             Tabs: [ Explore | Search | Saved | Trips | Profile ]
             ========================================================================= */
          <>
            {/* 1. Explore */}
            <Link
              href="/user/cars"
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px]",
                isExploreActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <Car className={cn("size-5 shrink-0", isExploreActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Explore</span>
            </Link>

            {/* 2. Search */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setSearchOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px] cursor-pointer",
                searchOpen ? activeTabClass : inactiveTabClass,
              )}
            >
              <SlidersHorizontal className={cn("size-5 shrink-0", searchOpen ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Search</span>
            </button>

            {/* 3. Saved */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setFavoritesOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px] cursor-pointer",
                favoritesOpen ? activeTabClass : inactiveTabClass,
              )}
            >
              <div className="relative">
                <Heart className={cn("size-5 shrink-0", favoritesOpen ? "stroke-[2.5]" : "stroke-2")} />
                {favoritesCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                    {favoritesCount > 9 ? "9+" : favoritesCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight font-extrabold">Saved</span>
            </button>

            {/* 4. Trips */}
            <Link
              href="/user/mybookings"
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px]",
                isTripsActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <CalendarDays className={cn("size-5 shrink-0", isTripsActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Trips</span>
            </Link>

            {/* 5. Profile */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setProfileOpen(true);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px] cursor-pointer",
                isProfileActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <User className={cn("size-5 shrink-0", isProfileActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Profile</span>
            </button>
          </>
        )}
      </nav>

      {/* Slide-Up Sheets (Optimized with Radix UI Sheet for zero-lag hardware-accelerated animations) */}
      {isAdminOrOperator && (
        <>
          <FleetSheet open={fleetOpen} onOpenChange={setFleetOpen} role={sessionUser?.role || "admin"} />
          <BookingsSheet open={bookingsOpen} onOpenChange={setBookingsOpen} role={sessionUser?.role || "admin"} />
          <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} role={sessionUser?.role || "admin"} />
        </>
      )}

      {/* Profile Bottom Sheet (Account, Theme Mode & Log Out) */}
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={sessionUser}
      />

      {/* User Search & Favorites Bottom Sheets */}
      <MobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />
      <FavoritesSheet open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </>
  );
}
