"use client";

import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

type RentCarFlowDialogProps = {
  car: CarWithOwner;
  agreementHtml?: string;
  trigger?: React.ReactNode;
};

export function RentCarFlowDialog({
  car,
  agreementHtml,
  trigger,
}: RentCarFlowDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [qrModalOpen, setQrModalOpen] = React.useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = React.useState(false);

  // Form states
  const [quickDuration, setQuickDuration] = React.useState<"10h" | "24h" | "custom">("24h");
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [pickupDatetime, setPickupDatetime] = React.useState("");
  const [returnDatetime, setReturnDatetime] = React.useState("");
  const [fulfillmentType, setFulfillmentType] = React.useState<"pickup" | "Delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [returnAddress, setReturnAddress] = React.useState("");

  // Month navigation for embedded availability calendar
  const [calDate, setCalDate] = React.useState(() => new Date());

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const branchName = car.branches?.name || "Instacar Main Branch";
  const branchAddress = "Instacar Car Rental Services, Pandac, Pavia, Iloilo";
  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress)}`;
  const qrUrl = siteAssetUrl("qr_code_payment.png");

  // Initialize pickup & return times
  React.useEffect(() => {
    if (open && !pickupDatetime) {
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
  }, [open, pickupDatetime]);

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

  // Calendar rendering helper for Availability preview
  const calendarDays = React.useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [calDate]);

  const monthYearLabel = calDate.toLocaleString("en-US", { month: "short", year: "numeric" });

  const nextMonth = () => {
    setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleSelectDay = (day: number | null) => {
    if (!day) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = calDate.getFullYear();
    const m = calDate.getMonth() + 1;
    const dateStr = `${y}-${pad(m)}-${pad(day)}`;

    const pTime = pickupDatetime ? pickupDatetime.slice(11, 16) : "09:00";
    const newPickup = `${dateStr}T${pTime}`;
    setPickupDatetime(newPickup);

    // Default return next day
    const nextD = new Date(calDate.getFullYear(), calDate.getMonth(), day + 1);
    const endStr = `${nextD.getFullYear()}-${pad(nextD.getMonth() + 1)}-${pad(nextD.getDate())}T${pTime}`;
    setReturnDatetime(endStr);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button
              type="button"
              className="w-full gap-2 rounded-xl bg-[#ffcc00] py-2.5 font-bold text-black transition hover:bg-[#ffd633]"
            >
              <CheckCircle2 className="size-4" />
              Book Now
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-border bg-[#0d0f12] p-4 text-foreground sm:p-6 sm:rounded-2xl">
          <DialogHeader className="border-b border-border/80 pb-3">
            <DialogTitle className="text-lg font-black tracking-tight text-foreground">
              Book {carName}
            </DialogTitle>
          </DialogHeader>

          <form action={createBookingAction} className="space-y-5 pt-2">
            <input type="hidden" name="car_id" value={car.id} />
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="end_date" value={endDate} />
            <input type="hidden" name="pickup_time" value={pickupTime} />
            <input type="hidden" name="return_time" value={returnTime} />
            <input type="hidden" name="fulfillment_type" value={fulfillmentType} />

            {/* 1. AVAILABILITY CALENDAR (Image 1) */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <CalendarIcon className="size-4 text-[#ffcc00]" />
                  <span>Availability Calendar</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  <span className="rounded bg-emerald-600 px-2 py-0.5 text-white">Available</span>
                  <span className="rounded bg-rose-600 px-2 py-0.5 text-white">Booked</span>
                  <span className="rounded bg-[#ffcc00] px-2 py-0.5 text-black">Selected</span>
                </div>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between border-y border-border/60 py-1.5 text-xs">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 font-bold text-foreground hover:bg-[#ffcc00] hover:text-black transition"
                >
                  &lt; Prev
                </button>
                <span className="font-extrabold text-foreground">{monthYearLabel}</span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 font-bold text-foreground hover:bg-[#ffcc00] hover:text-black transition"
                >
                  Next &gt;
                </button>
              </div>

              {/* Day Names Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-muted-foreground">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {calendarDays.map((d, index) => {
                  if (d === null) {
                    return <div key={`empty-${index}`} className="h-8" />;
                  }

                  const pad = (n: number) => String(n).padStart(2, "0");
                  const currentDayStr = `${calDate.getFullYear()}-${pad(calDate.getMonth() + 1)}-${pad(d)}`;
                  const isSelected =
                    startDate && endDate && currentDayStr >= startDate && currentDayStr <= endDate;
                  const isToday = new Date().toISOString().slice(0, 10) === currentDayStr;

                  return (
                    <button
                      type="button"
                      key={currentDayStr}
                      onClick={() => handleSelectDay(d)}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md font-bold transition",
                        isSelected
                          ? "border-2 border-[#ffcc00] bg-[#ffcc00]/20 text-[#ffcc00]"
                          : isToday
                            ? "border border-border bg-muted/60 text-foreground"
                            : "bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="size-3 text-muted-foreground" />
                <span>Grayed/Red dates are already booked. Please select available dates.</span>
              </p>
            </div>

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
                  onClick={() => setFulfillmentType("Delivery")}
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

            {/* 5. PICKUP ADDRESS BLOCK (Image 1) */}
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
                  onClick={() => setAgreementModalOpen(true)}
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
            <LoadingButton
              type="submit"
              disabled={!agreedToTerms || hours < 10}
              className="w-full rounded-xl bg-[#ffcc00] py-3 text-sm font-black text-black hover:bg-[#ffd633] transition"
            >
              Confirm Reservation
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* PAYMENT QR CODE MODAL (Image 4) */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-xs border-border bg-[#0d0f12] p-6 text-foreground sm:rounded-2xl text-center">
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

      {/* FULL RENTAL AGREEMENT MODAL */}
      <Dialog open={agreementModalOpen} onOpenChange={setAgreementModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-[#0d0f12] p-6 text-foreground sm:rounded-2xl">
          <DialogHeader className="border-b border-border/80 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FileCheck className="size-5 text-[#ffcc00]" />
              Official Car Rental Agreement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Please review the terms and conditions in full.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-2 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans">
            {OFFICIAL_RENTAL_AGREEMENT}
          </div>

          <div className="border-t border-border pt-3 flex justify-end">
            <Button
              type="button"
              onClick={() => {
                setAgreedToTerms(true);
                setAgreementModalOpen(false);
              }}
              className="bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633]"
            >
              I Accept Agreement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
