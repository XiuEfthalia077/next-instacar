"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Car,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User,
  Users,
  Wrench,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export interface MobileProfileUser {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export function ProfileSheet({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: MobileProfileUser | null;
}) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.body.classList.toggle("dark-mode", next);
    try {
      localStorage.setItem("instacar-admin-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  const role = user?.role || "user";
  const isAdminOrOperator = role === "admin" || role === "operator" || role === "staff";
  const displayName = user?.name || (isAdminOrOperator ? "Staff Member" : "Valued Customer");
  const displayEmail = user?.email || "";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  const roleBadgeStyle = {
    admin: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    operator: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    staff: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    user: "bg-[#ffcc00]/15 text-amber-800 dark:text-[#ffcc00] border-[#ffcc00]/30",
  }[role] || "bg-muted text-muted-foreground border-border";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-lg sm:mx-auto flex flex-col overflow-y-auto"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />

        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left shrink-0">
          <SheetTitle className="sr-only">Account &amp; Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Quick links to access your account settings, dashboards, and session controls.
          </SheetDescription>

          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00] text-black font-black text-lg shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-foreground truncate max-w-[200px]">
                  {displayName}
                </h3>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", roleBadgeStyle)}>
                  {role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {displayEmail}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-5 space-y-4 flex-1">
          {/* Section: Shortcuts */}
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
              Navigation &amp; Controls
            </p>

            {isAdminOrOperator ? (
              <>
                <Link
                  href={role === "operator" ? "/operator/dashboard" : role === "staff" ? "/staff/dashboard" : "/admin/dashboard"}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="size-4 text-[#ffcc00]" />
                    <span>Portal Dashboard</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/shared/profile"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="size-4 text-[#ffcc00]" />
                    <span>My Profile &amp; Settings</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/shared/cars"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Car className="size-4 text-[#ffcc00]" />
                    <span>Fleet Inventory</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/shared/calendar"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-4 text-[#ffcc00]" />
                    <span>Master Booking Calendar</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/user/dashboard"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="size-4 text-[#ffcc00]" />
                    <span>My Dashboard</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/user/profile"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-[#ffcc00]" />
                    <span>Profile &amp; Verification Docs</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/user/mybookings"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="size-4 text-[#ffcc00]" />
                    <span>My Trips &amp; Reservations</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>

                <Link
                  href="/user/cars"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Car className="size-4 text-[#ffcc00]" />
                    <span>Browse All Vehicles</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </>
            )}
          </div>

          {/* Section: Preferences */}
          <div className="pt-2 border-t border-border space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-2">
              Appearance
            </p>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? (
                  <Moon className="size-4 text-amber-400" />
                ) : (
                  <Sun className="size-4 text-amber-500" />
                )}
                <span>Theme Mode</span>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground capitalize">
                {isDark ? "Dark Theme" : "Light Theme"}
              </span>
            </button>
          </div>

          {/* Section: Logout */}
          <div className="pt-2 border-t border-border">
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-extrabold text-destructive hover:bg-destructive hover:text-white transition cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Log Out of InstaCar</span>
              </button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
