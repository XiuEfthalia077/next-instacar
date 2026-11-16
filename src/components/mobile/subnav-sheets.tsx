"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  Car,
  ChevronRight,
  Globe2,
  PenSquare,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SubnavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: string;
}

/**
 * FleetSheet
 * Mobile popup sheet for selecting Fleet views:
 * - Fleet Manager (/shared/cars)
 * - Vehicle Schedules & Blackouts (/shared/my_car_schedules)
 * - Master Booking Calendar (/shared/calendar)
 */
export function FleetSheet({ open, onOpenChange, role = "admin" }: SubnavSheetProps) {
  const pathname = usePathname();

  const options = [
    {
      label: "Fleet Manager",
      description: "Browse, inspect, and manage all vehicles",
      href: "/shared/cars",
      icon: Car,
      badge: "Vehicle List",
      isActive: pathname.startsWith("/shared/cars") || pathname.startsWith("/operator/view_car"),
    },
    {
      label: "Schedules & Blackouts",
      description: "Maintenance periods & blackout dates",
      href: "/shared/my_car_schedules",
      icon: Wrench,
      badge: "Maintenance",
      isActive: pathname.startsWith("/shared/my_car_schedules") || pathname.startsWith("/admin/fleet/schedules"),
    },
    {
      label: "Master Booking Calendar",
      description: "Visual timeline of vehicle bookings",
      href: "/shared/calendar",
      icon: CalendarDays,
      badge: "Calendar",
      isActive: pathname.startsWith("/shared/calendar"),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-lg sm:mx-auto flex flex-col overflow-y-auto"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />

        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left shrink-0">
          <SheetTitle className="text-base font-black text-foreground flex items-center gap-2">
            <Car className="size-5 text-[#ffcc00]" />
            <span>Fleet Management</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Select a fleet tool or schedule manager to view.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.href}
                href={opt.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group",
                  opt.isActive
                    ? "border-[#ffcc00] bg-[#ffcc00]/10 text-foreground ring-1 ring-[#ffcc00]/50"
                    : "border-border/80 bg-muted/20 hover:border-[#ffcc00]/50 hover:bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      opt.isActive
                        ? "bg-[#ffcc00] text-black"
                        : "bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00] group-hover:bg-[#ffcc00] group-hover:text-black"
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black truncate">{opt.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-background border border-border text-muted-foreground">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-[#ffcc00] shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * BookingsSheet
 * Mobile popup sheet for selecting Bookings views:
 * - Online Reservations (/admin/bookings_online or /operator/bookings or /staff/bookings)
 * - Manual Bookings (/admin/bookings_manual or /staff/bookings_manual)
 * - Master Booking Calendar (/shared/calendar)
 */
export function BookingsSheet({ open, onOpenChange, role = "admin" }: SubnavSheetProps) {
  const pathname = usePathname();

  const onlineHref =
    role === "operator"
      ? "/operator/bookings"
      : role === "staff"
        ? "/staff/bookings"
        : "/admin/bookings_online";

  const manualHref =
    role === "staff"
      ? "/staff/bookings_manual"
      : "/admin/bookings_manual";

  const options = [
    {
      label: "Online Bookings",
      description: "Customer web reservations & verification files",
      href: onlineHref,
      icon: ShoppingCart,
      badge: "Web Bookings",
      isActive:
        pathname.startsWith("/admin/bookings_online") ||
        pathname === "/operator/bookings" ||
        pathname === "/staff/bookings",
    },
    ...(role === "admin" || role === "staff"
      ? [
          {
            label: "Manual Bookings",
            description: "Walk-in & phone reservation entries",
            href: manualHref,
            icon: PenSquare,
            badge: "Walk-in / Phone",
            isActive:
              pathname.startsWith("/admin/bookings_manual") ||
              pathname === "/staff/bookings_manual",
          },
        ]
      : []),
    {
      label: "Master Booking Calendar",
      description: "Timeline & Gantt view of all reservations",
      href: "/shared/calendar",
      icon: CalendarDays,
      badge: "Calendar View",
      isActive: pathname.startsWith("/shared/calendar"),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-lg sm:mx-auto flex flex-col overflow-y-auto"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />

        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left shrink-0">
          <SheetTitle className="text-base font-black text-foreground flex items-center gap-2">
            <ShoppingCart className="size-5 text-[#ffcc00]" />
            <span>Bookings &amp; Reservations</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Switch between online pipeline, manual entries, or master calendar.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.href}
                href={opt.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group",
                  opt.isActive
                    ? "border-[#ffcc00] bg-[#ffcc00]/10 text-foreground ring-1 ring-[#ffcc00]/50"
                    : "border-border/80 bg-muted/20 hover:border-[#ffcc00]/50 hover:bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      opt.isActive
                        ? "bg-[#ffcc00] text-black"
                        : "bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00] group-hover:bg-[#ffcc00] group-hover:text-black"
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black truncate">{opt.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-background border border-border text-muted-foreground">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-[#ffcc00] shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
