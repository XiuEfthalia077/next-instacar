"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  Grid3x2,
  Inbox,
  LayoutGrid,
  PenSquare,
  Send,
  Settings,
  Shield,
  Star,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  ChevronRight,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MoreSheet({
  open,
  onOpenChange,
  role = "admin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: string;
}) {
  const isAdmin = role === "admin";
  const isOperator = role === "operator";
  const isStaff = role === "staff";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-3xl border-t border-border bg-card p-0 sm:max-w-lg sm:mx-auto flex flex-col overflow-y-auto"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 shrink-0" />

        <SheetHeader className="px-5 pt-3 pb-3 border-b border-border text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00] text-black font-black shadow-sm">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold text-foreground">
                Management Portal
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Quick access to administration, operations, and reports
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="p-5 space-y-5 flex-1">
          {/* ================================================================
              GROUP 1: MANAGEMENT
              ================================================================ */}
          {(isAdmin || isOperator) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                Management
              </p>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                <Link
                  href="/admin/review_list"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="size-4 text-[#ffcc00]" />
                    <span>Customer Reviews</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/branches"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Store className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Branch Locations</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin/contact_messages"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Inbox className="size-4 text-sky-600 dark:text-sky-400" />
                      <span>Contact Inquiries</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              GROUP 2: USERS MANAGEMENT
              ================================================================ */}
          {isAdmin && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                Users Management
              </p>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                <Link
                  href="/admin/staff"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <BadgeCheck className="size-4 text-[#ffcc00]" />
                    <span>Staff Console</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/users?role=admin"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="size-4 text-rose-600 dark:text-rose-400" />
                    <span>Admins</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/users?role=operator"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="size-4 text-blue-600 dark:text-blue-400" />
                    <span>Operators</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/users?role=user"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="size-4 text-teal-600 dark:text-teal-400" />
                    <span>Customers</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          )}

          {/* ================================================================
              GROUP 3: ACCOUNTING
              ================================================================ */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
              Accounting
            </p>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
              {isAdmin && (
                <>
                  <Link
                    href="/admin/settlements"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Settlements</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/admin/remittance"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="size-4 text-sky-600 dark:text-sky-400" />
                      <span>Staff Remittance</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/admin/operator_revenue"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="size-4 text-[#ffcc00]" />
                      <span>Operator Remittance</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                </>
              )}

              {isOperator && (
                <Link
                  href="/operator/revenue"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Operator Revenue</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
              )}

              {isStaff && (
                <>
                  <Link
                    href="/staff/staff_revenue"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Staff Revenue</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/staff/staff_settlements"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="size-4 text-[#ffcc00]" />
                      <span>Staff Settlements</span>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ================================================================
              GROUP 4: ANALYTICS
              ================================================================ */}
          {isAdmin && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                Analytics
              </p>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                <Link
                  href="/admin/financials?tab=overview"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Overview</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/financials?tab=revenue"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="size-4 text-[#ffcc00]" />
                    <span>Fleet Revenue</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/financials?tab=expenses"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="size-4 text-rose-600 dark:text-rose-400" />
                    <span>Fleet Breakdown</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/admin/financials?tab=income"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="size-4 text-purple-600 dark:text-purple-400" />
                    <span>Income Statement</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          )}

          {/* Special staff booking shortcuts */}
          {isStaff && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">
                Bookings
              </p>
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-muted/20 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                <Link
                  href="/staff/bookings_manual"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <PenSquare className="size-4 text-[#ffcc00]" />
                    <span>Manual Walk-in Bookings</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
                <Link
                  href="/staff/customers"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between p-3 text-xs font-bold text-foreground hover:bg-muted/40 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="size-4 text-teal-600 dark:text-teal-400" />
                    <span>Customers List</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
