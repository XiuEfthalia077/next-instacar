"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  MapPin,
  PhoneCall,
  QrCode,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import * as React from "react";

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { LoadingButton } from "@/components/common/loading-button";
import { AvailabilityCalendar } from "@/components/common/availability-calendar";
import { DatePicker } from "@/components/common/date-picker";
import { PastDateConfirmDialog } from "@/components/common/past-date-confirm-dialog";
import { TimePicker, getCurrentTime24 } from "@/components/common/time-picker";
import { UberInteractiveMapDialog } from "@/components/common/uber-interactive-map";
import { Money } from "@/components/common/money";
import { GoogleButton } from "@/components/auth/google-button";
import { createClient } from "@/utils/supabase/client";
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
  reason?: "Booked" | "Maintenance" | string;
};

type RentCarFlowDialogProps = {
  car: CarWithOwner;
  agreementHtml?: string;
  trigger?: React.ReactNode;
  blockedRanges?: BlockedRange[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isLoggedIn?: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  initialPickupTime?: string;
  initialReturnTime?: string;
};

function CleanAgreementContent({ content }: { content: string }) {
  const blocks = React.useMemo(() => {
    if (!content) return [];
    let text = content
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n\n### $1\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<p[^>]*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "");

    text = text
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    return text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, idx) => {
        if (line.startsWith("### ")) {
          return {
            id: idx,
            type: "heading" as const,
            text: line.replace(/^###\s*/, ""),
          };
        }
        if (/^[I|V|X]+\.\s+/i.test(line)) {
          return {
            id: idx,
            type: "heading" as const,
            text: line,
          };
        }
        if (/^\d+\.\d+\.?\s+/i.test(line)) {
          return {
            id: idx,
            type: "clause" as const,
            text: line,
          };
        }
        return {
          id: idx,
          type: "paragraph" as const,
          text: line,
        };
      });
  }, [content]);

  return (
    <div className="space-y-3">
      {blocks.map((b) => {
        if (b.type === "heading") {
          return (
            <h4
              key={b.id}
              className="text-sm sm:text-base font-extrabold text-[#b38a00] dark:text-[#ffcc00] mt-5 mb-2 uppercase tracking-wide border-b border-border/40 pb-1"
            >
              {b.text}
            </h4>
          );
        }
        if (b.type === "clause") {
          return (
            <p
              key={b.id}
              className="text-xs sm:text-[13px] font-medium text-foreground/90 leading-relaxed pl-3 border-l-2 border-[#ffcc00]/40 my-1.5"
            >
              {b.text}
            </p>
          );
        }
        return (
          <p
            key={b.id}
            className="text-xs sm:text-[13px] text-foreground/80 leading-relaxed my-1.5"
          >
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export function RentCarFlowDialog({
  car,
  agreementHtml,
  trigger,
  blockedRanges = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  isLoggedIn = true,
  initialStartDate,
  initialEndDate,
  initialPickupTime,
  initialReturnTime,
}: RentCarFlowDialogProps) {
  type FlowStep = "idle" | "agreement" | "form";
  const [flowStep, setFlowStep] = React.useState<FlowStep>("idle");
  const [readingTermsInForm, setReadingTermsInForm] = React.useState(false);
  const [qrModalOpen, setQrModalOpen] = React.useState(false);
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = React.useState(false);
  const [userLoggedIn, setUserLoggedIn] = React.useState(isLoggedIn);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Hassle-free documents state: check profile for existing verified IDs
  const [savedDocs, setSavedDocs] = React.useState<{
    primaryIdUrl?: string | null;
    secondaryIdUrl?: string | null;
    proofBillingUrl?: string | null;
    isVerified?: boolean;
    accountApproved?: boolean;
    profileLoaded?: boolean;
  }>({});
  const [replacePrimaryId, setReplacePrimaryId] = React.useState(false);
  const [replaceSecondaryId, setReplaceSecondaryId] = React.useState(false);
  const [replaceProofBilling, setReplaceProofBilling] = React.useState(false);

  React.useEffect(() => {
    setUserLoggedIn(isLoggedIn);
  }, [isLoggedIn]);

  React.useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          setUserLoggedIn(true);
          const { data: profile } = await supabase
            .from("users")
            .select("primary_id_url, secondary_id_url, proof_of_billing_url, id_verified, account_status, role")
            .eq("auth_id", user.id)
            .maybeSingle();

          if (profile) {
            const approved =
              profile.account_status === "APPROVED" ||
              Boolean(profile.id_verified) ||
              (profile.role && profile.role !== "user");
            setSavedDocs({
              primaryIdUrl: profile.primary_id_url,
              secondaryIdUrl: profile.secondary_id_url,
              proofBillingUrl: profile.proof_of_billing_url,
              isVerified: Boolean(profile.id_verified || approved),
              accountApproved: Boolean(approved),
              profileLoaded: true,
            });
          }
        }
      });
    } catch {}
  }, []);

  const isAccountPending =
    userLoggedIn && Boolean(savedDocs.profileLoaded) && !savedDocs.accountApproved;

  // Sync with external trigger (e.g. from gallery modal "Book This Vehicle")
  React.useEffect(() => {
    if (controlledOpen) {
      setFlowStep("agreement");
      controlledOnOpenChange?.(false);
    }
  }, [controlledOpen, controlledOnOpenChange]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [preFinalizeOpen, setPreFinalizeOpen] = React.useState(false);
  const preFinalizeConfirmedRef = React.useRef(false);
  const isModalOpen = flowStep !== "idle" || !!controlledOpen;

  const handleCloseAll = React.useCallback(() => {
    setIsSubmitting(false);
    preFinalizeConfirmedRef.current = false;
    setPreFinalizeOpen(false);
    setFlowStep("idle");
    setReadingTermsInForm(false);
  }, []);

  // Auto-close on navigation
  React.useEffect(() => {
    const handleNavigationClose = () => {
      handleCloseAll();
    };
    window.addEventListener("popstate", handleNavigationClose);
    window.addEventListener("instacar:close-modals", handleNavigationClose);
    return () => {
      window.removeEventListener("popstate", handleNavigationClose);
      window.removeEventListener("instacar:close-modals", handleNavigationClose);
    };
  }, [handleCloseAll]);

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
  const [mapDialogOpen, setMapDialogOpen] = React.useState(false);
  const [mapTarget, setMapTarget] = React.useState<"delivery" | "return">("delivery");
  const [estimatedDeliveryFee, setEstimatedDeliveryFee] = React.useState<number | null>(null);
  const [estimatedDeliveryKm, setEstimatedDeliveryKm] = React.useState<number | null>(null);
  const [pastConfirmOpen, setPastConfirmOpen] = React.useState(false);
  const [pastUnlocked, setPastUnlocked] = React.useState(false);
  const pastConfirmedRef = React.useRef(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const branchName = car.branches?.name || "Instacar Main Branch";
  const branchAddress = "Instacar Car Rental Services, Pandac, Pavia, Iloilo";
  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchAddress)}`;
  const qrUrl = siteAssetUrl("qr_code_payment.png");
  const CUSTOMER_DRAFT_KEY = `instacar_customer_rent_draft_${car.id}`;

  // Restore draft from localStorage when modal opens
  React.useEffect(() => {
    if (!isModalOpen) return;
    try {
      const saved = localStorage.getItem(CUSTOMER_DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.pickupDatetime) setPickupDatetime(d.pickupDatetime);
        if (d.returnDatetime) setReturnDatetime(d.returnDatetime);
        if (d.quickDuration) setQuickDuration(d.quickDuration);
        if (d.fulfillmentType) setFulfillmentType(d.fulfillmentType);
        if (d.deliveryAddress) setDeliveryAddress(d.deliveryAddress);
        if (d.returnAddress) setReturnAddress(d.returnAddress);
      }
    } catch {}
  }, [isModalOpen, CUSTOMER_DRAFT_KEY]);

  // Persist draft to localStorage on change
  React.useEffect(() => {
    if (!isModalOpen) return;
    try {
      const draft = {
        pickupDatetime,
        returnDatetime,
        quickDuration,
        fulfillmentType,
        deliveryAddress,
        returnAddress,
      };
      localStorage.setItem(CUSTOMER_DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    isModalOpen,
    CUSTOMER_DRAFT_KEY,
    pickupDatetime,
    returnDatetime,
    quickDuration,
    fulfillmentType,
    deliveryAddress,
    returnAddress,
  ]);

  // Initialize pickup & return times (prioritizing initial dates if provided)
  React.useEffect(() => {
    if (flowStep === "agreement" || flowStep === "form" || isModalOpen) {
      if (initialStartDate) {
        const pTime = initialPickupTime || (pickupDatetime ? pickupDatetime.slice(11, 16) : "10:00");
        const newStart = `${initialStartDate}T${pTime}`;
        setPickupDatetime(newStart);

        if (initialEndDate) {
          const rTime = initialReturnTime || (returnDatetime ? returnDatetime.slice(11, 16) : "10:00");
          setReturnDatetime(`${initialEndDate}T${rTime}`);
          setQuickDuration("custom");
        } else if (!returnDatetime) {
          const startMs = Date.parse(newStart);
          if (!isNaN(startMs)) {
            const end = new Date(startMs + 24 * 3_600_000);
            const pad = (n: number) => String(n).padStart(2, "0");
            setReturnDatetime(
              `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
            );
            setQuickDuration("24h");
          }
        }
      } else if (!pickupDatetime) {
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
    }
  }, [flowStep, isModalOpen, initialStartDate, initialEndDate, initialPickupTime, initialReturnTime]);

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
      const nowTime = getCurrentTime24();
      return {
        hours: 0,
        calculatedPrice: Number(car.price_24_hours ?? 0),
        startDate: "",
        endDate: "",
        pickupTime: nowTime,
        returnTime: nowTime,
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

  const handleConfirmBookingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Validate guest contact details if not logged in
    if (!userLoggedIn) {
      const form = formRef.current;
      const guestName = (form?.elements.namedItem("guest_name") as HTMLInputElement)?.value?.trim();
      const guestEmail = (form?.elements.namedItem("guest_email") as HTMLInputElement)?.value?.trim();
      const guestPhone = (form?.elements.namedItem("guest_phone") as HTMLInputElement)?.value?.trim();
      const guestPassword = (form?.elements.namedItem("guest_password") as HTMLInputElement)?.value;

      if (!guestName || !guestEmail || !guestPhone) {
        setAuthError("Please provide your Full Name, Email Address, and Phone Number to finalize your booking.");
        return;
      }
      if (guestPassword && guestPassword.length < 8) {
        setAuthError("If creating a password, it must be at least 8 characters long (or leave blank to book as guest).");
        return;
      }
    }

    if (!agreedToTerms || hours < 10 || hasDateOverlap || isSubmitting) return;

    const todayIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
    const isPast =
      (!!startDate && startDate < todayIso) ||
      (!!endDate && endDate < todayIso);

    if (isPast && !pastConfirmedRef.current) {
      setPastConfirmOpen(true);
      return;
    }

    if (!preFinalizeConfirmedRef.current) {
      setPreFinalizeOpen(true);
      return;
    }

    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  };

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
        <DialogContent className="max-h-[92vh] w-[95vw] sm:max-w-2xl md:max-w-3xl overflow-y-auto border-border bg-card p-5 sm:p-7 text-card-foreground sm:rounded-2xl">
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
              const todayIso = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Manila",
              }).format(new Date());
              const isPast =
                (!!startDate && startDate < todayIso) ||
                (!!endDate && endDate < todayIso);
              if (isPast && !pastConfirmedRef.current) {
                e.preventDefault();
                setPastConfirmOpen(true);
                return;
              }
              if (!preFinalizeConfirmedRef.current) {
                e.preventDefault();
                setPreFinalizeOpen(true);
                return;
              }
              setIsSubmitting(true);
              try {
                localStorage.removeItem(CUSTOMER_DRAFT_KEY);
              } catch {}
            }}
            className="space-y-6 pt-2"
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
              pastUnlocked={pastUnlocked}
              onUnlockPast={() => setPastUnlocked(true)}
              onSelectRange={(startDay, endDay) => {
                const nowTime = getCurrentTime24();
                const pTime = pickupDatetime ? pickupDatetime.slice(11, 16) : nowTime;
                const rTime = returnDatetime ? returnDatetime.slice(11, 16) : nowTime;
                setPickupDatetime(`${startDay}T${pTime}`);
                setReturnDatetime(`${endDay}T${rTime}`);
                setQuickDuration("custom");
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pickup_date" className="text-xs font-bold text-foreground">
                  Pickup Date
                </Label>
                <div className="mt-1">
                  <DatePicker
                    id="pickup_date"
                    name="pickup_date"
                    value={startDate}
                    onChange={(d) => {
                      const t = pickupTime || getCurrentTime24();
                      setPickupDatetime(`${d}T${t}`);
                      setQuickDuration("custom");
                    }}
                    placeholder="Select pickup date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pickup_time" className="text-xs font-bold text-foreground">
                  Pickup Time
                </Label>
                <div className="mt-1">
                  <TimePicker
                    id="pickup_time"
                    value={pickupTime}
                    onChange={(newTime) => {
                      const d = startDate || new Date().toISOString().slice(0, 10);
                      setPickupDatetime(`${d}T${newTime}`);
                      if (quickDuration === "10h") {
                        const startMs = new Date(`${d}T${newTime}`).getTime();
                        const end = new Date(startMs + 10 * 3_600_000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setReturnDatetime(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`);
                      } else if (quickDuration === "24h") {
                        const startMs = new Date(`${d}T${newTime}`).getTime();
                        const end = new Date(startMs + 24 * 3_600_000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setReturnDatetime(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`);
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="return_date" className="text-xs font-bold text-foreground">
                  Return Date
                </Label>
                <div className="mt-1">
                  <DatePicker
                    id="return_date"
                    name="return_date"
                    value={endDate}
                    minDate={startDate}
                    onChange={(d) => {
                      const t = returnTime || getCurrentTime24();
                      setReturnDatetime(`${d}T${t}`);
                      setQuickDuration("custom");
                    }}
                    placeholder="Select return date"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="return_time" className="text-xs font-bold text-foreground">
                  Return Time
                </Label>
                <div className="mt-1">
                  <TimePicker
                    id="return_time"
                    value={returnTime}
                    onChange={(newTime) => {
                      const d = endDate || startDate || new Date().toISOString().slice(0, 10);
                      setReturnDatetime(`${d}T${newTime}`);
                      setQuickDuration("custom");
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. PICK-UP & DELIVERY (Self Pick-up default; Delivery arranged by contacting office) */}
            <input type="hidden" name="delivery_address" value={branchAddress} />
            <input type="hidden" name="return_delivery_address" value={branchAddress} />

            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-sm sm:text-base font-black text-foreground">
                <MapPin className="size-4.5 text-[#b38a00] dark:text-[#ffcc00] shrink-0" />
                <span>Pick-up &amp; Delivery</span>
              </div>

              {/* Self Pick-up (FREE) */}
              <div className="space-y-1.5 pl-1">
                <p className="text-xs sm:text-sm font-extrabold text-foreground">
                  Self Pick-up (FREE)
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Please pick up your vehicle at our designated InstaCar office:
                </p>
                <a
                  href={mapSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#b38a00] dark:text-[#ffcc00] underline hover:opacity-85 transition"
                >
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{branchAddress}</span>
                </a>
              </div>

              <div className="border-t border-border/70" />

              {/* Vehicle Delivery (Contact Office) */}
              <div className="space-y-2.5 pl-1">
                <div className="flex items-center gap-2">
                  <Truck className="size-4.5 text-[#b38a00] dark:text-[#ffcc00] shrink-0" />
                  <p className="text-xs sm:text-sm font-extrabold text-foreground">
                    Vehicle Delivery (Additional Fee)
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vehicle delivery to your preferred location is available for an additional fee:
                </p>
                <ul className="space-y-1 text-xs text-foreground/90 pl-4 list-disc">
                  <li>
                    <strong>Within Iloilo City:</strong> ₱300 – ₱500 per way (during office hours).
                  </li>
                  <li>
                    <strong>Outside Iloilo City:</strong> Additional charges apply depending on the location and distance.
                  </li>
                </ul>

                <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
                  <PhoneCall className="size-4 text-[#b38a00] dark:text-[#ffcc00] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground leading-snug">
                      For delivery arrangements and exact quotations, please contact our team before confirming your booking:
                    </p>
                    <p className="text-xs sm:text-sm font-black text-[#b38a00] dark:text-[#ffcc00]">
                      <a href="tel:09915907335" className="hover:underline">0991 590 7335</a>
                      {" / "}
                      <a href="tel:09175540394" className="hover:underline">0917 554 0394</a>
                    </p>
                  </div>
                </div>

                <p className="text-[11px] italic text-muted-foreground text-center">
                  Note: Vehicle delivery is subject to availability and confirmation.
                </p>
              </div>
            </div>

            {/* 5. CAR WASHING FEE NOTICE */}
            <div className="flex items-start gap-3 rounded-2xl border border-[#ffcc00]/60 bg-[#ffcc00]/10 p-3.5 sm:p-4 text-xs">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ffcc00]/20 text-[#b38a00] dark:text-[#ffcc00]">
                <Truck className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-[#b38a00] dark:text-[#ffcc00] text-xs sm:text-sm">
                  Car Washing Fee
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  A <strong>₱200.00</strong> washing fee will be charged if the vehicle is returned not washed.
                </p>
              </div>
            </div>

            {/* 7. DOCUMENT UPLOADS & PROOF OF DOWNPAYMENT */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <FileText className="size-4 text-[#b38a00] dark:text-[#ffcc00]" />
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground">
                  {savedDocs.accountApproved
                    ? "Proof of Downpayment"
                    : "Verification Documents & Proof of Downpayment"}
                </h3>
              </div>

              {savedDocs.accountApproved ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center gap-3">
                  <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0 text-xs">
                    <p className="font-extrabold text-foreground">
                      Verified Account — IDs &amp; Proof of Billing on File
                    </p>
                    <p className="text-muted-foreground">
                      Your identity documents are already approved. Only Proof of Downpayment is required.
                    </p>
                  </div>
                  {savedDocs.primaryIdUrl ? (
                    <input type="hidden" name="existing_primary_id" value={savedDocs.primaryIdUrl} />
                  ) : null}
                  {savedDocs.secondaryIdUrl ? (
                    <input type="hidden" name="existing_secondary_id" value={savedDocs.secondaryIdUrl} />
                  ) : null}
                  {savedDocs.proofBillingUrl ? (
                    <input type="hidden" name="existing_proof_billing" value={savedDocs.proofBillingUrl} />
                  ) : null}
                </div>
              ) : null}

              <div
                className={cn(
                  "grid grid-cols-1 gap-4 items-start",
                  savedDocs.accountApproved ? "" : "md:grid-cols-2",
                )}
              >
                {!savedDocs.accountApproved ? (
                  <>
                    {/* PRIMARY ID */}
              {savedDocs.primaryIdUrl && !replacePrimaryId ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-foreground truncate">
                            Primary ID on File
                          </p>
                          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            {savedDocs.isVerified ? "Verified" : "Saved"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Government ID securely stored on your account. No re-upload required!
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="hidden" name="existing_primary_id" value={savedDocs.primaryIdUrl} />
                      <button
                        type="button"
                        onClick={() => setReplacePrimaryId(true)}
                        className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition cursor-pointer"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
                      <span>Primary ID (e.g. Driver&apos;s License)</span>
                      <span className="text-rose-500 font-black">*</span>
                    </Label>
                    {savedDocs.primaryIdUrl && replacePrimaryId && (
                      <button
                        type="button"
                        onClick={() => setReplacePrimaryId(false)}
                        className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
                      >
                        Keep ID on File
                      </button>
                    )}
                  </div>
                  <FileUploadDropzone
                    name="primary_id"
                    accept="image/*,.pdf"
                    maxSizeMB={5}
                    required={!savedDocs.primaryIdUrl || replacePrimaryId}
                    helperText="Click or drag to upload Primary ID (Required)"
                  />
                </div>
              )}

              {/* SECONDARY ID */}
              {savedDocs.secondaryIdUrl && !replaceSecondaryId ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-foreground truncate">
                            Secondary ID on File
                          </p>
                          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Saved
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Secondary identification document saved on your account.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="hidden" name="existing_secondary_id" value={savedDocs.secondaryIdUrl} />
                      <button
                        type="button"
                        onClick={() => setReplaceSecondaryId(true)}
                        className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition cursor-pointer"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      Secondary ID (Optional)
                    </Label>
                    {savedDocs.secondaryIdUrl && replaceSecondaryId && (
                      <button
                        type="button"
                        onClick={() => setReplaceSecondaryId(false)}
                        className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
                      >
                        Keep ID on File
                      </button>
                    )}
                  </div>
                  <FileUploadDropzone
                    name="secondary_id"
                    accept="image/*,.pdf"
                    maxSizeMB={5}
                    helperText="Click or drag to upload Secondary ID"
                  />
                </div>
              )}

              {/* PROOF OF BILLING */}
              {savedDocs.proofBillingUrl && !replaceProofBilling ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 sm:p-5 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold text-foreground truncate">
                            Proof of Billing on File
                          </p>
                          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Saved
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Utility or billing document saved on your account.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="hidden" name="existing_proof_of_billing" value={savedDocs.proofBillingUrl} />
                      <button
                        type="button"
                        onClick={() => setReplaceProofBilling(true)}
                        className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground hover:border-[#ffcc00] hover:text-[#b38a00] dark:hover:text-[#ffcc00] transition cursor-pointer"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm font-bold text-foreground">
                      Proof of Billing (Optional)
                    </Label>
                    {savedDocs.proofBillingUrl && replaceProofBilling && (
                      <button
                        type="button"
                        onClick={() => setReplaceProofBilling(false)}
                        className="text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:underline cursor-pointer"
                      >
                        Keep Proof of Billing on File
                      </button>
                    )}
                  </div>
                  <FileUploadDropzone
                    name="proof_of_billing"
                    accept="image/*,.pdf"
                    maxSizeMB={5}
                    helperText="Click or drag to upload Proof of Billing"
                  />
                </div>
              )}
                  </>
                ) : null}

              {/* PROOF OF PAYMENT + SCAN QR */}
              <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
                    <span>Proof of Payment</span>
                    <span className="text-rose-500 font-black">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#ffcc00] bg-[#ffcc00]/10 px-2.5 py-1 text-xs font-bold text-[#b38a00] dark:text-[#ffcc00] hover:bg-[#ffcc00]/20 transition cursor-pointer"
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
                  helperText="Click or drag to upload payment receipt / confirmation screenshot"
                />
                <div className="flex items-start gap-2 rounded-xl border border-[#ffcc00]/60 bg-[#ffcc00]/10 p-3 text-[11px] text-foreground/90">
                  <AlertCircle className="size-4 text-[#b38a00] dark:text-[#ffcc00] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-[#b38a00] dark:text-[#ffcc00]">Note:</strong> A minimum downpayment of at least{" "}
                    <strong className="text-[#b38a00] dark:text-[#ffcc00]">₱500.00</strong> is required. The downpayment is{" "}
                    <strong className="text-[#b38a00] dark:text-[#ffcc00]">non-refundable</strong> in case of cancellation or change of schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>

        {/* FULL WIDTH: RATE SUMMARY BREAKDOWN & CHECKOUT */}
        <div className="space-y-4 pt-2 border-t border-border/80">
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

              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">Delivery Fee Estimates (Negotiated via Phone):</p>
                <p>&bull; Within Iloilo City: <strong>₱300 – ₱500</strong> (during office hours)</p>
                <p>&bull; Outside Iloilo City: Additional charges apply depending on location and distance.</p>
                <p className="font-semibold text-amber-800 dark:text-[#ffcc00]">
                  For delivery arrangements &amp; exact quotations, call: 0991 590 7335 / 0917 554 0394
                </p>
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

              {/* Guest Checkout: Driver contact details and optional password */}
              {!userLoggedIn && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ffcc00] text-black text-xs font-black shadow-xs mt-0.5">
                      ✓
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-black text-foreground">
                        Guest Checkout &amp; Driver Details
                      </h4>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                        Enter your driver contact details. You can optionally set a password now or after checkout to securely save your uploaded IDs for future 1-click rentals.
                      </p>
                    </div>
                  </div>

                  {/* Google OAuth Option */}
                  <div className="pt-1">
                    <GoogleButton
                      label="Sign in with Google to Book"
                      showDisclaimer={false}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground my-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Or continue as guest</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {authError && (
                    <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-500 dark:text-rose-400">
                      {authError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-foreground">Full Name *</Label>
                      <Input
                        name="guest_name"
                        required
                        placeholder="Juan Dela Cruz"
                        className="mt-1 h-10 text-xs"
                        onChange={() => setAuthError(null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-foreground">Phone Number *</Label>
                      <Input
                        name="guest_phone"
                        required
                        placeholder="0917-123-4567"
                        className="mt-1 h-10 text-xs"
                        onChange={() => setAuthError(null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-foreground">Email Address *</Label>
                      <Input
                        name="guest_email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        className="mt-1 h-10 text-xs"
                        onChange={() => setAuthError(null)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-foreground">Create Password (Optional)</Label>
                      <Input
                        name="guest_password"
                        type="password"
                        minLength={8}
                        placeholder="•••••••• (Optional)"
                        className="mt-1 h-10 text-xs"
                        onChange={() => setAuthError(null)}
                      />
                    </div>
                  </div>
                </div>
              )}

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

            {/* Account Pending Verification Gate (Task 2) */}
            {isAccountPending && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3.5 text-xs space-y-2">
                <p className="font-extrabold text-amber-900 dark:text-[#ffcc00] flex items-center gap-1.5">
                  <AlertCircle className="size-4 shrink-0" />
                  Account Pending Verification
                </p>
                <p className="text-foreground/90 leading-relaxed">
                  Your account registration and verification documents are currently pending review by InstaCar. You cannot book a vehicle until verified. For faster verification, contact us: <strong>0991 590 7335 / 0917 554 0394</strong>.
                </p>
                <a
                  href="/user/profile?tab=documents"
                  className="inline-flex items-center gap-1 font-extrabold text-amber-800 dark:text-[#ffcc00] underline"
                >
                  Manage / Check My Documents →
                </a>
              </div>
            )}

            {/* 10. CONFIRM RESERVATION BUTTON */}
            {hasDateOverlap && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400">
                <AlertCircle className="size-4 shrink-0" />
                <span>Selected dates overlap with an existing booking or maintenance schedule. Please select available green dates.</span>
              </div>
            )}

            <LoadingButton
              type="button"
              onClick={handleConfirmBookingClick}
              disabled={!agreedToTerms || hours <= 0 || hasDateOverlap || isSubmitting || isAccountPending}
              loading={isSubmitting}
              loadingText="Submitting Booking..."
              className="w-full rounded-xl bg-[#ffcc00] py-3 text-sm font-black text-black hover:bg-[#ffd633] transition"
            >
              Confirm Booking
            </LoadingButton>
          </div>
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

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 m-4 rounded-xl border border-border/70 bg-muted/20 text-xs sm:text-[13px] leading-relaxed text-foreground/90 font-sans shadow-inner selection:bg-[#ffcc00] selection:text-black [scrollbar-color:#52525b_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
            <CleanAgreementContent content={agreementHtml || OFFICIAL_RENTAL_AGREEMENT} />
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
          <div className="flex-1 overflow-y-auto p-6 m-4 rounded-xl border border-border/70 bg-muted/20 text-xs sm:text-[13px] leading-relaxed text-foreground/90 font-sans [scrollbar-color:#52525b_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
            <CleanAgreementContent content={agreementHtml || OFFICIAL_RENTAL_AGREEMENT} />
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
          pastConfirmedRef.current = true;
          setPastConfirmOpen(false);
          setTimeout(() => {
            formRef.current?.requestSubmit();
          }, 50);
        }}
        title="Past Date Booking Confirmation"
        message="This booking is set in the past. Are you sure you want to proceed?"
      />

      {/* PRE-FINALIZATION MODAL */}
      <Dialog open={preFinalizeOpen} onOpenChange={setPreFinalizeOpen}>
        <DialogContent className="max-w-md border-border bg-card p-6 text-card-foreground sm:rounded-2xl shadow-xl">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#b38a00] dark:text-[#ffcc00] border border-[#ffcc00]/30 shadow-xs">
              <PhoneCall className="size-6" />
            </div>
            <DialogTitle className="text-lg font-black text-foreground">
              Delivery / Pickup Fee Notice
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Almost done! To finalize your delivery/pickup fee or confirm your schedule, please call or text us at{" "}
              <a href="tel:09915907335" className="font-bold text-[#b38a00] dark:text-[#ffcc00] underline">(0991) 590 7335</a> or{" "}
              <a href="tel:09175540394" className="font-bold text-[#b38a00] dark:text-[#ffcc00] underline">09175540394</a>. Our staff will manually add the negotiated fee to your booking.
            </DialogDescription>
            <div className="grid grid-cols-2 gap-3 w-full pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreFinalizeOpen(false)}
                className="rounded-xl border-border text-xs font-bold"
              >
                Review Details
              </Button>
              <Button
                type="button"
                onClick={() => {
                  preFinalizeConfirmedRef.current = true;
                  setPreFinalizeOpen(false);
                  setIsSubmitting(true);
                  setTimeout(() => {
                    formRef.current?.requestSubmit();
                  }, 50);
                }}
                className="rounded-xl bg-[#ffcc00] text-xs font-black text-black hover:bg-[#ffd633] transition"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* INTERACTIVE UBER-STYLE MAP MODAL */}
      <UberInteractiveMapDialog
        open={mapDialogOpen}
        onOpenChange={setMapDialogOpen}
        initialAddress={mapTarget === "delivery" ? deliveryAddress : returnAddress}
        title={mapTarget === "delivery" ? "Pin Delivery Location" : "Pin Return Location"}
        onConfirmLocation={({ address: resolvedAddr }) => {
          if (mapTarget === "delivery") {
            setDeliveryAddress(resolvedAddr);
          } else {
            setReturnAddress(resolvedAddr);
          }
        }}
      />
    </>
  );
}
