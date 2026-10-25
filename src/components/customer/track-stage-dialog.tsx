"use client";

import {
  AlertCircle,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  KeyRound,
  MapPin,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingRow } from "@/lib/data/bookings";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatPeso } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TrackStageDialogProps = {
  booking: BookingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STAGES = [
  {
    key: "Pending",
    label: "Pending Verification",
    short: "Pending",
    desc: "Identity documents and down payment receipt are being verified by our reservations dispatch team.",
    nextStep: "Staff will review your submitted Primary ID and payment within 15-30 minutes.",
    icon: Clock,
  },
  {
    key: "Confirmed",
    label: "Confirmed & Reserved",
    short: "Confirmed",
    desc: "Your reservation is fully approved and locked. The vehicle is being prepped, washed, and inspected.",
    nextStep: "Prepare to present your original valid driver's license upon vehicle handoff.",
    icon: CheckCircle2,
  },
  {
    key: "Released",
    label: "Released (On the Road)",
    short: "Released",
    desc: "Vehicle keys and credentials have been handed over. Trip is actively running. Enjoy your drive!",
    nextStep: "Drive safely and return the vehicle on or before the agreed scheduled return time.",
    icon: KeyRound,
  },
  {
    key: "Completed",
    label: "Completed & Returned",
    short: "Completed",
    desc: "Vehicle returned safely, odometer & condition checked, security settlement finalized.",
    nextStep: "Thank you for renting with Instacar! You may leave a customer review.",
    icon: Flag,
  },
];

export function TrackStageDialog({
  booking,
  open,
  onOpenChange,
}: TrackStageDialogProps) {
  if (!booking) return null;

  const isCancelled = booking.status === "Cancelled";
  const carName =
    [booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") ||
    "Vehicle";

  // Determine current active stage index (0 to 3)
  const currentStageIdx = (() => {
    switch (booking.status) {
      case "Pending":
        return 0;
      case "Confirmed":
        return 1;
      case "Released":
        return 2;
      case "Completed":
        return 3;
      default:
        return 0;
    }
  })();

  const currentStageInfo = STAGES[currentStageIdx];
  const isDelivery =
    booking.fulfillment_type?.toLowerCase() === "delivery" ||
    Boolean(booking.delivery_address);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border bg-[#0d0f12] p-5 text-foreground sm:p-6 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#ffcc00]/20 text-[#ffcc00]">
                <Truck className="size-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Fulfillment &amp; Trip Tracker
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Booking #{booking.id} — {carName} ({booking.cars?.type || "Sedan"})
                </DialogDescription>
              </div>
            </div>
            <StatusBadge status={booking.status} />
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* CANCELLATION NOTICE IF CANCELLED */}
          {isCancelled ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-1 text-xs text-rose-300">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertCircle className="size-4" />
                <span>Booking Has Been Cancelled</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200/90">
                This reservation was cancelled. If you believe this is in error or need a refund for your down payment, please contact our support team.
              </p>
            </div>
          ) : (
            /* 4-STAGE TIMELINE STEPPER */
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-muted-foreground uppercase tracking-wider">
                  Trip Progression
                </span>
                <span className="font-mono text-[11px] font-bold text-[#ffcc00]">
                  Stage {currentStageIdx + 1} of 4
                </span>
              </div>

              {/* Stepper Graphic */}
              <div className="relative flex items-center justify-between py-1">
                {/* Background Connecting Line */}
                <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-muted/60" />
                {/* Active Progress Line */}
                <div
                  className="absolute left-6 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[#ffcc00] to-emerald-500 transition-all duration-500"
                  style={{
                    width: `${(currentStageIdx / (STAGES.length - 1)) * 100}%`,
                  }}
                />

                {STAGES.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  const isFuture = idx > currentStageIdx;

                  return (
                    <div
                      key={step.key}
                      className="relative z-10 flex flex-col items-center"
                    >
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-full border-2 transition-all",
                          isDone
                            ? "border-emerald-500 bg-emerald-500 text-black shadow-sm"
                            : isCurrent
                              ? "border-[#ffcc00] bg-[#ffcc00] text-black shadow-md ring-4 ring-[#ffcc00]/25"
                              : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 text-[10px] font-bold tracking-tight text-center",
                          isCurrent
                            ? "text-[#ffcc00]"
                            : isDone
                              ? "text-emerald-400"
                              : "text-muted-foreground",
                        )}
                      >
                        {step.short}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CURRENT STAGE HIGHLIGHT CARD */}
              <div className="rounded-xl border border-[#ffcc00]/40 bg-[#ffcc00]/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#ffcc00] text-black text-xs font-black">
                    {currentStageIdx + 1}
                  </span>
                  <h4 className="text-xs font-black text-foreground">
                    Current Stage: {currentStageInfo.label}
                  </h4>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {currentStageInfo.desc}
                </p>
                <div className="rounded-lg bg-black/40 border border-border/60 p-2.5 text-[11px] text-muted-foreground">
                  <strong className="text-amber-300">Next Step: </strong>
                  {currentStageInfo.nextStep}
                </div>
              </div>
            </div>
          )}

          {/* RENTAL WINDOW & LOCATION DETAILS */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarDays className="size-3 text-[#ffcc00]" />
                Scheduled Rental Window
              </span>
              <p className="text-xs font-bold text-foreground">
                {formatDate(booking.start_date)} to {formatDate(booking.end_date)}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                Pickup: {formatTime(booking.pickup_time)} • Return: {formatTime(booking.return_time)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-[#ffcc00]" />
                Fulfillment Type
              </span>
              <p className="text-xs font-bold text-foreground">
                {isDelivery ? "🚚 Car Delivery" : "🏢 Office Self-Pickup"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isDelivery
                  ? booking.delivery_address || "Delivery address registered"
                  : "Pavia, Iloilo Main Branch"}
              </p>
            </div>
          </div>

          {/* FINANCIAL SUMMARY */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-xs">
            <span className="font-semibold text-muted-foreground">
              Total Booking Cost:
            </span>
            <span className="text-base font-extrabold text-[#ffcc00]">
              {formatPeso(booking.total_price)}
            </span>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-between border-t border-border/80 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>

            <Link
              href={`/shared/booking_details?id=${booking.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ffcc00] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#ffd633]"
            >
              <span>View Full Booking Details</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
