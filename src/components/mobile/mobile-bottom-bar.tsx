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
 * 5. Admin / Operator Side: [ Dashboard | Fleet | Schedule | Bookings | Profile ].
 * 6. Profile tab opens control center sheet for settings, administration, theme, and sign out.
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  const { count: favoritesCount } = useFavorites();

  const [searchOpen, setSearchOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
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

  // 2. Resolve authentication and active user role (Fetch ONCE on mount to ensure zero lag during navigation)
  useEffect(() => {
    if (isAuthRoute) {
      setIsAuthenticated(false);
      return;
    }

    const isPortalRoute =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/operator") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/shared") ||
      pathname.startsWith("/user");

    if (isPortalRoute) {
      setIsAuthenticated(true);
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        if (!isPortalRoute) {
          setIsAuthenticated(false);
          setSessionUser(null);
        }
        return;
      }

      setIsAuthenticated(true);

      supabase
        .from("users")
        .select("id, name, email, role")
        .eq("auth_id", user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
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
        });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (!isPortalRoute) {
          setIsAuthenticated(false);
          setSessionUser(null);
        }
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run once on mount for instant zero-lag tab clicks!

  // If on auth route or definitely unauthenticated, do not render bottom navigation
  if (isAuthRoute || isAuthenticated === false) {
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
    pathname.startsWith("/operator/view_car");

  const isScheduleActive =
    pathname.startsWith("/shared/calendar") ||
    pathname.startsWith("/shared/my_car_schedules") ||
    pathname.startsWith("/admin/fleet/schedules");

  const isBookingsActive =
    pathname.startsWith("/operator/bookings") ||
    pathname.startsWith("/staff/bookings") ||
    pathname.startsWith("/admin/bookings");

  // Determine active route targets for User
  const isExploreActive = pathname === "/" || pathname === "/user/cars" || pathname.startsWith("/public/cars");
  const isTripsActive = pathname.startsWith("/user/mybookings");

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
             ADMIN / OPERATOR / STAFF NAVIGATION TABS
             Tabs: [ Dashboard | Fleet | Schedule | Bookings | Profile ]
             ========================================================================= */
          <>
            {/* 1. Dashboard */}
            <Link
              href={dashboardHref}
              prefetch={true}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px]",
                isDashboardActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <LayoutDashboard className={cn("size-5 shrink-0", isDashboardActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Dashboard</span>
            </Link>

            {/* 2. Fleet */}
            <Link
              href="/shared/cars"
              prefetch={true}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px]",
                isFleetActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <Car className={cn("size-5 shrink-0", isFleetActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Fleet</span>
            </Link>

            {/* 3. Schedule */}
            <Link
              href="/shared/calendar"
              prefetch={true}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px]",
                isScheduleActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <CalendarDays className={cn("size-5 shrink-0", isScheduleActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Schedule</span>
            </Link>

            {/* 4. Bookings */}
            <Link
              href={bookingsHref}
              prefetch={true}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-center transition-all min-w-[58px] min-h-[44px]",
                isBookingsActive ? activeTabClass : inactiveTabClass,
              )}
            >
              <ClipboardList className={cn("size-5 shrink-0", isBookingsActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Bookings</span>
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
                profileOpen ? activeTabClass : inactiveTabClass,
              )}
            >
              <User className={cn("size-5 shrink-0", profileOpen ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight font-extrabold">Profile</span>
            </button>
          </>
        )}
      </nav>

      {/* Profile Bottom Sheet (Quick Controls, Dashboard Link, Theme & Sign Out) */}
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={sessionUser}
      />

      {/* Mobile Search Bottom Sheet */}
      <MobileSearchSheet open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Saved / Favorites Bottom Sheet */}
      <FavoritesSheet open={favoritesOpen} onOpenChange={setFavoritesOpen} />
    </>
  );
}
