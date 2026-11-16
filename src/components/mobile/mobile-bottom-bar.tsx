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
 * 6. Profile tab opens a unified control center sheet with quick navigation, theme toggle, and logout.
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

  // 2. Resolve authentication and active user role
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

    // If already inside authenticated portal route, we know user is authenticated
    if (isPortalRoute) {
      setIsAuthenticated(true);
    }

    // Query client session to fetch user details and role
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

      // Fetch profile role from public.users
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
  }, [pathname, isAuthRoute]);

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

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md transition-all md:hidden"
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
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
                isDashboardActive
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutDashboard className={cn("size-5", isDashboardActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Dashboard</span>
              {isDashboardActive && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
            </Link>

            {/* 2. Fleet */}
            <Link
              href="/shared/cars"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
                isFleetActive
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Car className={cn("size-5", isFleetActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Fleet</span>
              {isFleetActive && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
            </Link>

            {/* 3. Schedule */}
            <Link
              href="/shared/calendar"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
                isScheduleActive
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays className={cn("size-5", isScheduleActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Schedule</span>
              {isScheduleActive && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
            </Link>

            {/* 4. Bookings */}
            <Link
              href={bookingsHref}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
                isBookingsActive
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ClipboardList className={cn("size-5", isBookingsActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Bookings</span>
              {isBookingsActive && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
            </Link>

            {/* 5. Profile */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px] cursor-pointer",
                profileOpen
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <User className={cn("size-5", profileOpen ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Profile</span>
              {profileOpen && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
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
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
                isExploreActive
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Car className={cn("size-5", isExploreActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Explore</span>
              {isExploreActive && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
            </Link>

            {/* 2. Search */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setSearchOpen(true);
              }}
              className="relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center text-muted-foreground transition-colors hover:text-foreground min-w-[56px] min-h-[44px] cursor-pointer"
            >
              <SlidersHorizontal className="size-5 stroke-2" />
              <span className="text-[10px] tracking-tight">Search</span>
            </button>

            {/* 3. Saved */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setFavoritesOpen(true);
              }}
              className="relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center text-muted-foreground transition-colors hover:text-foreground min-w-[56px] min-h-[44px] cursor-pointer"
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

            {/* 4. Trips */}
            <Link
              href="/user/mybookings"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px]",
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

            {/* 5. Profile */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-2.5 py-1 text-center transition-colors min-w-[56px] min-h-[44px] cursor-pointer",
                profileOpen
                  ? "font-black text-[#ffcc00]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <User className={cn("size-5", profileOpen ? "stroke-[2.5]" : "stroke-2")} />
              <span className="text-[10px] tracking-tight">Profile</span>
              {profileOpen && (
                <span className="size-1 rounded-full bg-[#ffcc00] shadow-[0_0_6px_#ffcc00]" />
              )}
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
