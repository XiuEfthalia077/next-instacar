import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarDays,
  CalendarRange,
  Car,
  CalendarClock,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  Grid3x2,
  HouseHeart,
  PenSquare,
  Search,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  Star,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import type { UserRole } from "@/lib/types";

export const BRAND = {
  name: "InstaCar",
  yellow: "#ffcc00",
  yellowSoft: "#ffd700",
  yellowHover: "#e0b800",
  yellowMuted: "#e6b800",
  black: "#000000",
  surface: "#0a0a0a",
  surfaceRaised: "#1a1a1a",
  surfaceSoft: "#121212",
  surfaceBorder: "#2c2c2c",
  text: "#ffffff",
  muted: "#6c757d",
} as const;

export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  operator: "/operator/dashboard",
  staff: "/staff/dashboard",
  user: "/user/dashboard",
};

export const BOOKING_STATUSES = [
  "Pending",
  "Confirmed",
  "Released",
  "Completed",
  "Cancelled",
] as const;

export const BOOKING_TYPES = ["online", "manual"] as const;

export const FULFILLMENT_TYPES = ["Pickup", "Delivery"] as const;

export const CAR_STATUSES = [
  "Available",
  "Active",
  "Maintenance",
  "Not Available",
  "Reserved",
] as const;

export const TRANSMISSIONS = ["Manual", "Automatic"] as const;

export const SCHEDULE_REASONS = [
  "Maintenance",
  "Personal Use",
  "Unavailable",
  "Other",
] as const;

export const REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "replied",
] as const;

export const USER_ROLES: UserRole[] = ["admin", "operator", "staff", "user"];

/** Minimum booking duration in hours (car-rental booking_process.php). */
export const MIN_BOOKING_HOURS = 10;

/** Fixed cancellation fee applied by the legacy cancel action. */
export const CANCELLATION_FEE = 500;

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  /** Small uppercase section label, e.g. "Management". */
  section?: string;
  items: NavEntry[];
};

export type NavChild = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavParent = {
  label: string;
  icon: LucideIcon;
  children: NavChild[];
};

export type NavEntry = NavItem | NavParent;

export function isNavParent(entry: NavEntry): entry is NavParent {
  return "children" in entry;
}

/**
 * Sidebar structure - ported 1:1 from
 * car-rental/pages/components/sidebar.php
 */
export const SIDEBAR_NAV: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      section: "Main View",
      items: [{ label: "Dashboard", href: "/admin/dashboard", icon: Grid3x2 }],
    },
    {
      section: "Management",
      items: [
        { label: "Reviews", href: "/admin/review_list", icon: Star },
        { label: "Branches", href: "/admin/branches", icon: Store },
      ],
    },
    {
      section: "Users",
      items: [
        {
          label: "Users",
          icon: Users,
          children: [
            { label: "Staff", href: "/admin/users?role=staff", icon: BadgeCheck },
            { label: "Admins", href: "/admin/users?role=admin", icon: Shield },
            { label: "Operators", href: "/admin/users?role=operator", icon: Wrench },
            { label: "Customers", href: "/admin/users?role=user", icon: Users },
          ],
        },
        {
          label: "Staff Management",
          icon: BadgeCheck,
          children: [
            { label: "Staff", href: "/admin/staff_manager", icon: Grid3x2 },
          ],
        },
        {
          label: "Fleet Management",
          icon: Car,
          children: [
            { label: "Fleet", href: "/shared/cars", icon: Car },
            { label: "Schedules", href: "/shared/my_car_schedules", icon: CalendarRange },
          ],
        },
      ],
    },
    {
      section: "Bookings",
      items: [
        {
          label: "Bookings",
          icon: CalendarClock,
          children: [
            { label: "Calendar View", href: "/shared/calendar", icon: CalendarDays },
            { label: "Online Bookings", href: "/admin/bookings_online", icon: ShoppingCart },
            { label: "Manual Bookings", href: "/admin/bookings_manual", icon: PenSquare },
          ],
        },
      ],
    },
    {
      section: "Financials",
      items: [
        {
          label: "Accounting",
          icon: Wallet,
          children: [
            { label: "Settlements", href: "/admin/settlements", icon: BadgeCheck },
            { label: "Staff Remittance", href: "/admin/remittance", icon: Send },
            { label: "Operator Remittance", href: "/admin/operator_revenue", icon: Briefcase },
          ],
        },
      ],
    },
    {
      section: "Reports",
      items: [
        {
          label: "Analytics",
          icon: BarChart3,
          children: [
            { label: "Profit Analytics", href: "/admin/analytics", icon: TrendingUp },
            { label: "Fleet Revenue", href: "/admin/admin_revenue", icon: Settings },
            { label: "Fleet Breakdown", href: "/admin/expenses", icon: FileSpreadsheet },
            { label: "Income Statement", href: "/admin/income", icon: BarChart3 },
          ],
        },
      ],
    },
  ],
  operator: [
    {
      section: "Overview",
      items: [{ label: "Dashboard", href: "/operator/dashboard", icon: Grid3x2 }],
    },
    {
      section: "Fleet",
      items: [
        { label: "Calendar View", href: "/shared/calendar", icon: CalendarDays },
        {
          label: "My Fleet",
          icon: Car,
          children: [
            { label: "Fleet Manager", href: "/shared/cars", icon: Car },
            { label: "Schedules", href: "/shared/my_car_schedules", icon: CalendarRange },
          ],
        },
        { label: "Reservations", href: "/operator/bookings", icon: ClipboardCheck },
      ],
    },
    {
      section: "Finances",
      items: [{ label: "Earnings", href: "/operator/revenue", icon: Wallet }],
    },
  ],
  staff: [
    {
      section: "Overview",
      items: [{ label: "Dashboard", href: "/staff/dashboard", icon: Grid3x2 }],
    },
    {
      section: "Operations",
      items: [{ label: "Calendar View", href: "/shared/calendar", icon: CalendarDays }],
    },
    {
      section: "Bookings",
      items: [
        { label: "Manage Bookings", href: "/staff/bookings", icon: ClipboardCheck },
        { label: "Manual Booking", href: "/staff/bookings_manual", icon: PenSquare },
      ],
    },
    {
      section: "Financials",
      items: [
        { label: "Settlements", href: "/staff/staff_settlements", icon: BadgeCheck },
        { label: "Gross Earnings", href: "/staff/staff_gross", icon: BarChart3 },
      ],
    },
    {
      section: "Support",
      items: [{ label: "Customers", href: "/staff/customers", icon: Users }],
    },
  ],
  user: [
    {
      section: "Navigation",
      items: [{ label: "Home", href: "/user/dashboard", icon: HouseHeart }],
    },
    {
      section: "Rental Service",
      items: [
        { label: "Find a Car", href: "/user/cars", icon: Search },
        { label: "My Trips", href: "/user/mybookings", icon: Clock },
      ],
    },
    {
      section: "Account",
      items: [
        { label: "Profile & Settings", href: "/user/profile", icon: Settings },
      ],
    },
  ],
};

/**
 * Top bar title per role - ported from
 * car-rental/pages/components/header.php
 */
export const PANEL_TITLE = "MANAGEMENT PORTAL";

export function panelSubtitle(role: UserRole) {
  return `${role.toUpperCase()} ACCESS`;
}

/** Public landing page nav (car-rental/index.php). */
export const PUBLIC_NAV = [
  { label: "How It Works", href: "#features" },
  { label: "Our Fleet", href: "#fleet" },
  { label: "Contact Us", href: "#contact" },
];

/** Contact form subject options (car-rental/index.php). */
export const CONTACT_SUBJECTS = [
  "Booking & Reservation Inquiry",
  "Vehicle Breakdown / Emergency Support",
  "Payment & Billing Issue",
  "Cancellation or Rescheduling Request",
  "Requirements & Documentation",
  "Feedback & Complaints",
  "Other / Custom Subject",
];

/** Rounding helper used by the money formatters. */
export function round2(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** `₱1,234.00` with the peso sign - matches the legacy `number_format($v, 2)`. */
export function formatPeso(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** `1,234.00` without the peso sign. */
export function formatAmount(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Booking status -> tailwind badge classes (legacy Bootstrap equivalents). */
export const STATUS_BADGE: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Released: "bg-sky-100 text-sky-800 border-sky-200",
  Completed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  Maintenance: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  Active: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
  Available: "bg-[#ffcc00]/20 text-[#b38a00] dark:text-[#ffd700] border-[#ffcc00]/40",
  Booked: "bg-sky-500/20 text-sky-400 border-sky-500/40",
};

/** Calendar event colours - ported from fetch_bookings.php. */
export const STATUS_COLOR: Record<string, string> = {
  Approved: "#10b981",
  Pending: "#f59e0b",
  Confirmed: "#10b981",
  Released: "#6366f1",
  Completed: "#6366f1",
  Cancelled: "#f43f5e",
  Maintenance: "#ef4444",
};
