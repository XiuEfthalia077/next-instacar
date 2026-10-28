"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  MapPin,
  QrCode,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import * as React from "react";

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { LoadingButton } from "@/components/common/loading-button";
import { AvailabilityCalendar } from "@/components/common/availability-calendar";
import { PastDateConfirmDialog } from "@/components/common/past-date-confirm-dialog";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBookingAction } from "@/lib/actions/bookings";
import { OFFICIAL_RENTAL_AGREEMENT } from "@/lib/constants/rental-agreement";
import type { CarWithOwner } from "@/lib/data/cars";
import { formatPeso } from "@/lib/constants";
import { siteAssetUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type BlockedRange = {
  start: string;
  end: string;
  reason: "Booked" | "Maintenance";
};

type RentCarFlowDialogProps = {
  car: CarWithOwner;
  agreementHtml?: string;
  trigger?: React.ReactNode;
  blockedRanges?: BlockedRange[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function RentCarFlowDialog({
  car,
  agreementHtml,
  trigger,
  blockedRanges = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RentCarFlowDialogProps) {
  type FlowStep = "idle" | "agreement" | "form";
  const [flowStep, setFlowStep] = React.useState<FlowStep>("idle");
  const [readingTermsInForm, setReadingTermsInForm] = React.useState(false);
  const [qrModalOpen, setQrModalOpen] = React.useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = React.useState(false);

  // Sync with external trigger (e.g. from gallery modal "Book This Vehicle")
  React.useEffect(() => {
    if (controlledOpen) {
      setFlowStep("agreement");
      controlledOnOpenChange?.(false);
    }
  }, [controlledOpen, controlledOnOpenChange]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCloseAll = React.useCallback(() => {
    setIsSubmitting(false);
    setFlowStep("idle");
    setReadingTermsInForm(false);
  }, []);

  const handleStartBooking = React.useCallback(() => {
    setFlowStep("agreement");
  }, []);

  // Form states
  const [quickDuration, setQuickDuration] = React.useState<"10h" | "24h" | "custom">("24h");
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [pickupDatetime, setPickupDatetime] = React.useState("");
  const [returnDatetime, setReturnDatetime] = React.useState("");
  const [fulfillmentType, setFulfillmentType] = React.useState<"pickup" | "Delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [returnAddress, setReturnAddress] = React.useState("");
  const [pastConfirmOpen, setPastConfirmOpen] = React.useState(false);
  const [pastConfirmed, setPastConfirmed] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const branchName = car.branches?.name || "Instacar Main Branch";
  const branchAddress = "Instacar Car Rental Services, Pandac, Pavia, Iloilo";
  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress)}`;
  const qrUrl = siteAssetUrl("qr_code_payment.png");

  // Initialize pickup & return times
  React.useEffect(() => {
    if ((flowStep === "agreement" || flowStep === "form") && !pickupDatetime) {
      const now = new Date();
      now.setHours(now.getHours() + 2);
      now.setMinutes(0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      
      const end = new Date(now.getTime() + 24 * 3_600_000);
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;

      setPickupDatetime(startStr);
      setReturnDatetime(endStr);
      setQuickDuration("24h");
      setAgreedToTerms(false);
    }
  }, [flowStep, pickupDatetime]);

  // Handle Quick Duration Click
  const handleQuickDuration = (mode: "10h" | "24h" | "custom") => {
    setQuickDuration(mode);
    if (!pickupDatetime) return;
    const startMs = Date.parse(pickupDatetime);
    if (isNaN(startMs)) return;

    const pad = (n: number) => String(n).padStart(2, "0");
    if (mode === "10h") {
      const end = new Date(startMs + 10 * 3_600_000);
      setReturnDatetime(
        `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
      );
    } else if (mode === "24h") {
      const end = new Date(startMs + 24 * 3_600_000);
      setReturnDatetime(
        `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
      );
    }
  };

  // Pricing & Duration calculation
  const { hours, calculatedPrice, startDate, endDate, pickupTime, returnTime } = React.useMemo(() => {
    if (!pickupDatetime || !returnDatetime) {
      return {
        hours: 0,
        calculatedPrice: Number(car.price_24_hours ?? 0),
        startDate: "",
        endDate: "",
        pickupTime: "00:00",
        returnTime: "00:00",
      };
    }

    const startMs = Date.parse(pickupDatetime);
    const endMs = Date.parse(returnDatetime);

    const sDate = pickupDatetime.slice(0, 10);
    const eDate = returnDatetime.slice(0, 10);
    const pTime = pickupDatetime.slice(11, 16);
    const rTime = returnDatetime.slice(11, 16);

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return {
        hours: 0,
        calculatedPrice: Number(car.price_24_hours ?? 0),
        startDate: sDate,
        endDate: eDate,
        pickupTime: pTime,
        returnTime: rTime,
      };
    }

    const totalHours = Math.round(((endMs - startMs) / 3_600_000) * 10) / 10;
    const p10 = Number(car.price_10_hours ?? 0);
    const p12 = Number(car.price_12_hours ?? 0);
    const p24 = Number(car.price_24_hours ?? 0);

    let price = 0;
    if (totalHours <= 10 && p10 > 0) {
      price = p10;
    } else if (totalHours <= 12 && p12 > 0) {
      price = p12;
    } else if (totalHours <= 24 && p24 > 0) {
      price = p24;
    } else if (p24 > 0) {
      const days = Math.ceil(totalHours / 24);
      price = days * p24;
    } else {
      price = p24;
    }

    return {
      hours: totalHours,
      calculatedPrice: price,
      startDate: sDate,
      endDate: eDate,
      pickupTime: pTime,
      returnTime: rTime,
    };
  }, [pickupDatetime, returnDatetime, car]);

  // Calendar overlap check
  const hasDateOverlap = React.useMemo(() => {
    if (!startDate || !endDate) return false;
    return blockedRanges.some((r) => r.start <= endDate && r.end >= startDate);
  }, [startDate, endDate, blockedRanges]);

  return (
    <>
      {/* Trigger: Click starts Step 1 (Car Rental Agreement Modal) */}
      <div onClick={handleStartBooking} className="cursor-pointer">
        {trigger || (
          <Button
            type="button"
            className="w-full gap-2 rounded-xl bg-[#ffcc00] py-2.5 font-bold text-black transition hover:bg-[#ffd633]"
          >
            <CheckCircle2 className="size-4" />
            Book Now
          </Button>
        )}
      </div>

      {/* STEP 2: BOOKING FORM MODAL (Only opens after Agreement is accepted) */}
      <Dialog open={flowStep === "form"} onOpenChange={(isOpen) => !isOpen && handleCloseAll()}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-border bg-card p-6 text-card-foreground sm:p-8 sm:rounded-2xl">
          <DialogHeader className="border-b border-border/80 pb-4 pr-8">
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Book {carName}
            </DialogTitle>
          </DialogHeader>

          <form
            ref={formRef}
            action={createBookingAction}
            onSubmit={(e) => {
              if (isSubmitting) {
                e.preventDefault();
                return;
              }
              const todayIso = new Date().toISOString().slice(0, 10);
              const isPast = !!startDate && startDate < todayIso;
              if (isPast && !pastConfirmed) {
                e.preventDefault();
                setPastConfirmOpen(true);
                return;
              }
              setIsSubmitting(true);
            }}
            className="space-y-5 pt-2"
          >
            <input type="hidden" name="car_id" value={car.id} />
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="end_date" value={endDate} />
            <input type="hidden" name="pickup_time" value={pickupTime} />
            <input type="hidden" name="return_time" value={returnTime} />
            <input type="hidden" name="fulfillment_type" value={fulfillmentType} />

            {/* 1. AVAILABILITY CALENDAR (Image 1) */}
            <AvailabilityCalendar
              startDate={startDate}
              endDate={endDate}
              blockedRanges={blockedRanges}
              allowPastDates={true}
              onSelectDay={(dayStr) => {
                const pTime = pickupDatetime ? pickupDatetime.slice(11, 16) : "09:00";
                const newPickup = `${dayStr}T${pTime}`;
                setPickupDatetime(newPickup);

                if (quickDuration === "10h") {
                  const end = new Date(Date.parse(newPickup) + 10 * 3_600_000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  setReturnDatetime(
                    `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
                  );
                } else if (quickDuration === "24h") {
                  const end = new Date(Date.parse(newPickup) + 24 * 3_600_000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  setReturnDatetime(
                    `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
                  );
                } else {
                  const nextD = new Date(`${dayStr}T12:00:00`);
                  nextD.setDate(nextD.getDate() + 1);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  setReturnDatetime(
                    `${nextD.getFullYear()}-${pad(nextD.getMonth() + 1)}-${pad(nextD.getDate())}T${pTime}`,
                  );
                }
              }}
            />

            {/* 2. QUICK DURATION TABS (Image 1) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Quick Duration</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDuration("10h")}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-black transition",
                    quickDuration === "10h"
                      ? "border-[#ffcc00] bg-[#ffcc00] text-black shadow-sm"
                      : "border-border bg-card text-foreground hover:border-[#ffcc00]",
                  )}
                >
                  10 Hours
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration("24h")}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-black transition",
                    quickDuration === "24h"
                      ? "border-[#ffcc00] bg-[#ffcc00] text-black shadow-sm"
                      : "border-border bg-card text-foreground hover:border-[#ffcc00]",
                  )}
                >
                  24 Hours
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDuration("custom")}
                  className={cn(
                    "rounded-xl border py-2 text-xs font-black transition",
                    quickDuration === "custom"
                      ? "border-[#ffcc00] bg-[#ffcc00] text-black shadow-sm"
                      : "border-border bg-card text-foreground hover:border-[#ffcc00]",
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* 3. PICKUP & RETURN DATE/TIME INPUTS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="pickup_datetime" className="text-xs font-bold text-foreground">
                  Pickup Date &amp; Time
                </Label>
                <Input
                  id="pickup_datetime"
                  type="datetime-local"
                  value={pickupDatetime}
                  onChange={(e) => {
                    setPickupDatetime(e.target.value);
                    setQuickDuration("custom");
                  }}
                  required
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="return_datetime" className="text-xs font-bold text-foreground">
                  Return Date &amp; Time
                </Label>
                <Input
                  id="return_datetime"
                  type="datetime-local"
                  value={returnDatetime}
                  onChange={(e) => {
                    setReturnDatetime(e.target.value);
                    setQuickDuration("custom");
                  }}
                  required
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>

            {/* 4. FULFILLMENT TYPE (Self Pickup vs Car Delivery) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Fulfillment Type</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("pickup")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                    fulfillmentType === "pickup"
                      ? "border-[#ffcc00] bg-[#ffcc00]/10 shadow-sm"
                      : "border-border bg-card hover:border-[#ffcc00]/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      fulfillmentType === "pickup" ? "bg-[#ffcc00] text-black" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Self Pickup</p>
                    <p className="text-[11px] text-muted-foreground">Pickup at office</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (fulfillmentType !== "Delivery") {
                      setDeliveryConfirmOpen(true);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                    fulfillmentType === "Delivery"
                      ? "border-[#ffcc00] bg-[#ffcc00]/10 shadow-sm"
                      : "border-border bg-card hover:border-[#ffcc00]/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      fulfillmentType === "Delivery" ? "bg-[#ffcc00] text-black" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Truck className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Car Delivery</p>
                    <p className="text-[11px] text-muted-foreground">Deliver to location</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 5. ADDRESS BLOCK: CONDITIONAL PICKUP OR DELIVERY */}
            {fulfillmentType === "Delivery" ? (
              <div className="rounded-xl border border-[#ffcc00]/50 bg-[#ffcc00]/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffcc00] uppercase tracking-wider">
                    <Truck className="size-4" />
                    <span>Delivery Address (Where should we deliver the vehicle?) *</span>
                  </div>
                  {deliveryAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ffcc00] hover:underline"
                    >
                      <MapPin className="size-3" />
                      <span>View Map</span>
                    </a>
                  )}
                </div>
                <textarea
                  id="delivery_address_field"
                  name="delivery_address"
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter complete street address, landmark, subdivision, hotel or delivery instructions..."
                  className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground outline-none transition focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50"
                />
                <p className="text-[11px] text-muted-foreground">
                  📍 Our staff will deliver the vehicle directly to this address before your rental start time.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <MapPin className="size-4 text-[#ffcc00]" />
                  <span>Pickup Address</span>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ffcc00]/20 text-[#ffcc00]">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-muted-foreground">
                        Pickup Location
                      </span>
                      <a
                        href={mapSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ffcc00] hover:underline"
                      >
                        <span>↗ Map</span>
                      </a>
                    </div>
                    <p className="text-xs font-bold text-foreground truncate">{branchAddress}</p>
                    <p className="text-[11px] text-muted-foreground">🏢 {branchName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. RETURN ADDRESS BLOCK (Clarified: Where we will collect the car) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="return_address_field" className="text-xs font-bold text-rose-500 flex items-center gap-1">
                  <span>↵ Return Address (Where we will pick up the car)</span>
                </Label>
                <a
                  href={mapSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-[#ffcc00]"
                >
                  <MapPin className="size-3" />
                  <span>View Map</span>
                </a>
              </div>
              <textarea
                id="return_address_field"
                name="return_address"
                rows={2}
                value={returnAddress}
                onChange={(e) => setReturnAddress(e.target.value)}
                placeholder="Enter address for vehicle return / pickup..."
                className="w-full rounded-xl border border-border bg-card p-2.5 text-xs text-foreground outline-none transition focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/50"
              />
            </div>

            {/* 7. DOCUMENT UPLOADS */}
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block text-xs font-bold text-rose-500">
                  Primary ID (e.g. Driver&apos;s License) *
                </Label>
                <FileUploadDropzone
                  name="primary_id"
                  accept="image/*,.pdf"
                  maxSizeMB={5}
                  required
                  helperText="Click to upload Primary ID (Required)"
                />
              </div>

              <div>
                <Label className="mb-1 block text-xs font-bold text-foreground">
                  Secondary ID (Optional)
                </Label>
                <FileUploadDropzone
                  name="secondary_id"
                  accept="image/*,.pdf"
                  maxSizeMB={5}
                  helperText="Click to upload Secondary ID"
                />
              </div>

              <div>
                <Label className="mb-1 block text-xs font-bold text-foreground">
                  Proof of Billing (Optional)
                </Label>
                <FileUploadDropzone
                  name="proof_of_billing"
                  accept="image/*,.pdf"
                  maxSizeMB={5}
                  helperText="Click to upload Proof of Billing"
                />
              </div>

              {/* Proof of Payment + Scan QR Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-rose-500">
                    Proof of Payment (Required) *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffcc00]/60 bg-[#ffcc00]/10 px-2.5 py-1 text-xs font-bold text-[#ffcc00] hover:bg-[#ffcc00]/20 transition"
                  >
                    <QrCode className="size-3.5" />
                    <span>Scan QR: Tap to open</span>
                  </button>
                </div>
                <FileUploadDropzone
                  name="proof_of_payment"
                  accept="image/*,.pdf"
                  maxSizeMB={5}
                  required
                  helperText="Click to upload Proof of Payment"
                />
                <p className="text-[11px] text-muted-foreground">
                  Scan QR code to pay down payment / full amount, then attach receipt photo.
                </p>
                <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  <span>Note: Initial down payment must be a minimum of ₱500.</span>
                </p>
              </div>
            </div>

            {/* 8. RATE SUMMARY BREAKDOWN */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base Rental Rate:</span>
                <span className="font-bold text-foreground">{formatPeso(calculatedPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Duration:</span>
                <span className="font-bold text-foreground">{hours.toFixed(1)} Hours</span>
              </div>

              <div className="border-t border-border/80 pt-2 flex items-center justify-between">
                <span className="text-sm font-extrabold text-foreground">Total Due:</span>
                <span className="text-xl font-black text-[#ffcc00]">
                  {formatPeso(calculatedPrice)}
                </span>
              </div>

              <div className="pt-1 text-[11px] text-muted-foreground space-y-0.5">
                <p>ⓘ Additional fees apply for delivery and pickup outside our office.</p>
                <p>🚗 Carwash fee may apply depending on vehicle condition upon return.</p>
              </div>
            </div>

            {/* 9. RENTAL AGREEMENT TERMS */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-[#ffcc00]" />
                  <span>Car Rental Agreement &amp; Terms</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReadingTermsInForm(true)}
                  className="text-xs font-bold text-[#ffcc00] hover:underline"
                >
                  View Full Agreement
                </button>
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  id="agree_terms_cb"
                  type="checkbox"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-[#ffcc00] focus:ring-[#ffcc00]"
                />
                <label
                  htmlFor="agree_terms_cb"
                  className="cursor-pointer text-xs font-medium text-foreground leading-tight"
                >
                  I have read, understood, and accept the Car Rental Agreement and Terms &amp;
                  Conditions for renting this vehicle.
                </label>
              </div>
            </div>

            {/* 10. CONFIRM RESERVATION BUTTON */}
            {hasDateOverlap && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertCircle className="size-4 shrink-0" />
                <span>Selected dates overlap with an existing booking or maintenance schedule. Please select available green dates.</span>
              </div>
            )}

            <LoadingButton
              type="submit"
              disabled={!agreedToTerms || hours < 10 || hasDateOverlap || isSubmitting}
              loading={isSubmitting}
              loadingText="Confirming Booking..."
              className="w-full rounded-xl bg-[#ffcc00] py-3 text-sm font-black text-black hover:bg-[#ffd633] transition"
            >
              Confirm Booking
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELIVERY CONFIRMATION MODAL */}
      <Dialog open={deliveryConfirmOpen} onOpenChange={setDeliveryConfirmOpen}>
        <DialogContent className="max-w-sm border-border bg-card p-6 text-card-foreground sm:rounded-2xl">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="rounded-full bg-[#ffcc00]/15 p-3 text-[#ffcc00]">
              <Truck className="size-6" />
            </div>
            <DialogTitle className="text-base font-extrabold text-foreground">
              Do you want car delivery?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              We can deliver this vehicle straight to your home, airport, or hotel. Additional delivery fees apply depending on distance from our Pavia branch.
            </DialogDescription>
            <div className="grid grid-cols-2 gap-2.5 w-full pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFulfillmentType("pickup");
                  setDeliveryConfirmOpen(false);
                }}
                className="rounded-xl text-xs font-semibold"
              >
                No, Self Pickup
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setFulfillmentType("Delivery");
                  setDeliveryConfirmOpen(false);
                }}
                className="rounded-xl bg-[#ffcc00] font-black text-black hover:bg-[#ffd633]"
              >
                Yes, Deliver Car
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PAYMENT QR CODE MODAL (Image 4) */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-xs border-border bg-card p-6 text-card-foreground sm:rounded-2xl text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-xl bg-[#ffcc00] p-2 text-black flex items-center justify-center">
              <QrCode className="size-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-foreground">Payment QR Code</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Scan this QR Code using GCash / Maya / Banking app to send your payment.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-3 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Payment QR Code"
                className="size-48 object-contain"
              />
            </div>

            <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400">
              💡 Take a screenshot of payment receipt after scanning
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setQrModalOpen(false)}
              className="w-full rounded-xl font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STEP 1: OFFICIAL CAR RENTAL AGREEMENT MODAL (Appears FIRST before booking form) */}
      <Dialog
        open={flowStep === "agreement"}
        onOpenChange={(isOpen) => !isOpen && handleCloseAll()}
      >
        <DialogContent className="flex flex-col max-h-[90vh] max-w-2xl sm:max-w-3xl overflow-hidden p-0 border-border bg-card text-card-foreground sm:rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-border/80 px-6 py-5 bg-card shrink-0 pr-14 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-foreground">
              <FileCheck className="size-5 text-[#ffcc00]" />
              Official Car Rental Agreement
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-muted-foreground font-medium">
              Step 1 of 2 — Please review and accept the rental terms before reserving {carName}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 m-4 rounded-xl border border-border/70 bg-muted/20 text-xs sm:text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans shadow-inner selection:bg-[#ffcc00] selection:text-black">
            {OFFICIAL_RENTAL_AGREEMENT}
          </div>

          <div className="border-t border-border/80 px-6 py-4 bg-card shrink-0 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseAll}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Decline &amp; Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAgreedToTerms(true);
                // Enforce strict sequence: Close agreement modal completely before opening booking form modal
                setFlowStep("idle");
                setTimeout(() => {
                  setFlowStep("form");
                }, 150);
              }}
              className="h-10 px-5 rounded-xl bg-[#ffcc00] font-black text-xs sm:text-sm text-black shadow-md hover:bg-[#ffd633] transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              I Accept Agreement &amp; Continue to Booking →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auxiliary Reader Dialog (only if user clicks 'View Full Agreement' while inside the booking form) */}
      <Dialog open={readingTermsInForm} onOpenChange={setReadingTermsInForm}>
        <DialogContent className="flex flex-col max-h-[85vh] max-w-2xl sm:max-w-3xl overflow-hidden p-0 border-border bg-card text-card-foreground sm:rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-border/80 px-6 py-4 bg-card shrink-0 pr-14 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <FileCheck className="size-4 text-[#ffcc00]" />
              Official Car Rental Agreement
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 m-4 rounded-xl border border-border/70 bg-muted/20 text-xs sm:text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
            {OFFICIAL_RENTAL_AGREEMENT}
          </div>
          <div className="border-t border-border/80 px-6 py-3 bg-card shrink-0 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReadingTermsInForm(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Back to Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PAST DATE CONFIRMATION MODAL */}
      <PastDateConfirmDialog
        open={pastConfirmOpen}
        onOpenChange={setPastConfirmOpen}
        onConfirm={() => {
          setPastConfirmed(true);
          setIsSubmitting(true);
          setTimeout(() => {
            formRef.current?.requestSubmit();
          }, 0);
        }}
      />
    </>
  );
}
