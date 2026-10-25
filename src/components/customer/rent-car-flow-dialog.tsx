"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  MapPin,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import * as React from "react";

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { LoadingButton } from "@/components/common/loading-button";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBookingAction } from "@/lib/actions/bookings";
import type { CarWithOwner } from "@/lib/data/cars";
import { carImageUrl } from "@/lib/storage";

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
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [pickupTime, setPickupTime] = React.useState("09:00");
  const [returnTime, setReturnTime] = React.useState("18:00");
  const [fulfillmentType, setFulfillmentType] = React.useState<"pickup" | "Delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = React.useState("");
  const [returnAddress, setReturnAddress] = React.useState("");
  const [deliveryFeeAcknowledged, setDeliveryFeeAcknowledged] = React.useState(false);

  // File state tracking
  const [primaryIdFile, setPrimaryIdFile] = React.useState<File | null>(null);

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  const firstImg = car.image_path ? car.image_path.split(",")[0].trim() : "default.png";
  const imgUrl = carImageUrl(firstImg);

  // Reset to step 1 whenever dialog reopens
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setAgreedToTerms(false);
      setDeliveryFeeAcknowledged(false);
    }
  }, [open]);

  // Duration & estimated pricing calculation
  const { hours, calculatedPrice } = React.useMemo(() => {
    if (!startDate || !endDate || !pickupTime || !returnTime) {
      return { hours: 0, calculatedPrice: Number(car.price_24_hours ?? 0) };
    }

    const startMs = Date.parse(`${startDate}T${pickupTime}:00`);
    const endMs = Date.parse(`${endDate}T${returnTime}:00`);

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return { hours: 0, calculatedPrice: Number(car.price_24_hours ?? 0) };
    }

    const totalHours = Math.round(((endMs - startMs) / 3_600_000) * 10) / 10;

    let price = 0;
    const p10 = Number(car.price_10_hours ?? 0);
    const p12 = Number(car.price_12_hours ?? 0);
    const p24 = Number(car.price_24_hours ?? 0);

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

    return { hours: totalHours, calculatedPrice: price };
  }, [startDate, endDate, pickupTime, returnTime, car]);

  // Minimum date today
  const todayDateStr = React.useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    if (fulfillmentType === "Delivery") {
      setStep(3); // Go to delivery warning
    } else {
      setStep(4); // Go straight to confirmation
    }
  };

  return (
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

      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-border bg-[#0d0f12] text-foreground sm:rounded-2xl">
        {/* Step Progression Indicators */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-extrabold ${
                step >= 1 ? "bg-[#ffcc00] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              1
            </span>
            <span
              className={`text-xs font-bold ${
                step === 1 ? "text-[#ffcc00]" : "text-muted-foreground"
              }`}
            >
              Agreement
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-extrabold ${
                step >= 2 ? "bg-[#ffcc00] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-bold ${
                step === 2 ? "text-[#ffcc00]" : "text-muted-foreground"
              }`}
            >
              Details
            </span>
            {fulfillmentType === "Delivery" ? (
              <>
                <span className="text-muted-foreground/40">/</span>
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-extrabold ${
                    step >= 3
                      ? "bg-[#ffcc00] text-black"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                <span
                  className={`text-xs font-bold ${
                    step === 3 ? "text-[#ffcc00]" : "text-muted-foreground"
                  }`}
                >
                  Delivery Notice
                </span>
              </>
            ) : null}
            <span className="text-muted-foreground/40">/</span>
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-extrabold ${
                step === 4 ? "bg-[#ffcc00] text-black" : "bg-muted text-muted-foreground"
              }`}
            >
              {fulfillmentType === "Delivery" ? "4" : "3"}
            </span>
            <span
              className={`text-xs font-bold ${
                step === 4 ? "text-[#ffcc00]" : "text-muted-foreground"
              }`}
            >
              Confirm
            </span>
          </div>
        </div>

        {/* ================= STEP 1: RENTAL AGREEMENT ================= */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <FileCheck className="size-5 text-[#ffcc00]" />
                Car Rental Terms & Agreement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please review the vehicle lease terms and conditions before proceeding.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground/90">
              {agreementHtml ? (
                <div
                  className="prose prose-invert prose-xs max-w-none"
                  dangerouslySetInnerHTML={{ __html: agreementHtml }}
                />
              ) : (
                <div className="space-y-3">
                  <h4 className="font-bold text-foreground">
                    1. RENTAL QUALIFICATIONS & IDENTIFICATION
                  </h4>
                  <p>
                    The renter must possess a valid government-issued Driver&apos;s
                    License and a secondary proof of identification. Vehicles may only
                    be operated by authorized drivers listed on the rental contract.
                  </p>
                  <h4 className="font-bold text-foreground">
                    2. VEHICLE CARE & FUEL POLICY
                  </h4>
                  <p>
                    The vehicle will be handed over in clean condition with a noted
                    fuel level. The renter agrees to return the vehicle with the same
                    fuel level. Smoking and illegal substances inside the vehicle are
                    strictly prohibited.
                  </p>
                  <h4 className="font-bold text-foreground">
                    3. EXTENSIONS & DELAYS
                  </h4>
                  <p>
                    Late returns without prior authorization will incur standard
                    overtime extension fees based on company pricing guidelines.
                  </p>
                  <h4 className="font-bold text-foreground">
                    4. SECURITY DEPOSIT & CANCELLATION
                  </h4>
                  <p>
                    Any security deposit collected will be refunded upon safe return
                    of the vehicle inspection.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
              <input
                id="terms_agree"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-[#ffcc00] focus:ring-[#ffcc00]"
              />
              <label
                htmlFor="terms_agree"
                className="cursor-pointer text-xs font-semibold text-foreground"
              >
                I have read, understood, and accept the Car Rental Agreement and Terms
                & Conditions for renting {carName}.
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!agreedToTerms}
                onClick={() => setStep(2)}
                className="gap-2 bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633] disabled:opacity-50"
              >
                <span>Continue to Booking</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: BOOKING FORM ================= */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4 pt-2">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-lg font-bold text-foreground">
                <span>Configure Your Rental ({carName})</span>
                <span className="text-base text-[#ffcc00]">
                  <Money value={calculatedPrice} />
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select your pickup schedule, fulfillment location, and upload your ID.
              </DialogDescription>
            </DialogHeader>

            {/* Dates & Times */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="start_date" className="text-xs font-bold text-foreground">
                  Pick-up Date *
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  min={todayDateStr}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pickup_time" className="text-xs font-bold text-foreground">
                  Pick-up Time *
                </Label>
                <Input
                  id="pickup_time"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="end_date" className="text-xs font-bold text-foreground">
                  Return Date *
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  min={startDate || todayDateStr}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="return_time" className="text-xs font-bold text-foreground">
                  Return Time *
                </Label>
                <Input
                  id="return_time"
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Calculated duration notice */}
            {hours > 0 ? (
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3.5 py-2 text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#ffcc00]" />
                  Total Duration: {hours.toFixed(1)} hours
                </span>
                <span className="text-[#ffcc00]">
                  Estimated Rate: <Money value={calculatedPrice} />
                </span>
              </div>
            ) : null}

            {/* Fulfillment Type */}
            <div className="space-y-2 border-t border-border/80 pt-3">
              <Label className="text-xs font-bold text-foreground">
                Vehicle Handover / Fulfillment Method *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("pickup")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                    fulfillmentType === "pickup"
                      ? "border-[#ffcc00] bg-[#ffcc00]/10 text-foreground ring-1 ring-[#ffcc00]"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapPin className="size-4 text-[#ffcc00]" />
                  <span className="text-xs font-bold">Pick-up at Branch</span>
                  <span className="text-[10px] text-muted-foreground">
                    {car.branches?.name ?? "Main Station"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType("Delivery")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${
                    fulfillmentType === "Delivery"
                      ? "border-[#ffcc00] bg-[#ffcc00]/10 text-foreground ring-1 ring-[#ffcc00]"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Truck className="size-4 text-[#ffcc00]" />
                  <span className="text-xs font-bold">Doorstep Delivery</span>
                  <span className="text-[10px] text-muted-foreground">
                    Additional fees apply
                  </span>
                </button>
              </div>

              {fulfillmentType === "Delivery" ? (
                <div className="space-y-2 pt-2">
                  <div>
                    <Label
                      htmlFor="delivery_address"
                      className="text-xs font-bold text-foreground"
                    >
                      Delivery Destination Address *
                    </Label>
                    <Input
                      id="delivery_address"
                      placeholder="Hotel, residence, or airport arrival terminal..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required={fulfillmentType === "Delivery"}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="return_delivery_address"
                      className="text-xs font-bold text-foreground"
                    >
                      Return / Retrieval Address (if different)
                    </Label>
                    <Input
                      id="return_delivery_address"
                      placeholder="Leave blank if same as delivery address"
                      value={returnAddress}
                      onChange={(e) => setReturnAddress(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Document Uploads */}
            <div className="space-y-3 border-t border-border/80 pt-3">
              <div>
                <Label className="mb-1 block text-xs font-bold text-foreground">
                  Primary Government ID / Driver&apos;s License (Required) *
                </Label>
                <FileUploadDropzone
                  name="primary_id"
                  accept="image/*,.pdf"
                  maxSizeMB={5}
                  helperText="Upload valid Driver's License or Passport (JPG, PNG, PDF max 5MB)."
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
                  helperText="Company ID, Postal ID, or National ID."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border/80 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                Back to Terms
              </Button>
              <Button
                type="submit"
                className="gap-2 bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633]"
              >
                <span>Continue</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: DELIVERY WARNING MODAL ================= */}
        {step === 3 && (
          <div className="space-y-4 pt-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-amber-400">
                <AlertTriangle className="size-5" />
                Delivery Surcharge Notice
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Important information regarding delivery and collection charges.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
              <p className="font-bold text-sm text-amber-300">
                Notice: Additional fees apply for doorstep delivery
              </p>
              <p className="mt-1.5">
                Delivery and vehicle retrieval services incur additional dispatch fees
                calculated based on destination distance and toll expenses from the
                assigned branch (<strong>{car.branches?.name ?? "Branch"}</strong>).
              </p>
              <p className="mt-1">
                Our operations team will verify your destination (
                <span className="font-semibold text-white">{deliveryAddress}</span>) and
                notify you of the final delivery fee prior to dispatch.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
              <input
                id="delivery_ack"
                type="checkbox"
                checked={deliveryFeeAcknowledged}
                onChange={(e) => setDeliveryFeeAcknowledged(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-[#ffcc00] focus:ring-[#ffcc00]"
              />
              <label
                htmlFor="delivery_ack"
                className="cursor-pointer text-xs font-semibold text-foreground"
              >
                I acknowledge that delivery and retrieval fees are separate from the
                base rental price and will be settled with dispatch.
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-border/80 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(2)}
                className="text-xs"
              >
                Back to Details
              </Button>
              <Button
                type="button"
                disabled={!deliveryFeeAcknowledged}
                onClick={() => setStep(4)}
                className="gap-2 bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633] disabled:opacity-50"
              >
                <span>Proceed to Review</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: FINAL CONFIRMATION ================= */}
        {step === 4 && (
          <form action={createBookingAction} className="space-y-4 pt-2">
            {/* Hidden inputs forwarding all values to Server Action */}
            <input type="hidden" name="car_id" value={car.id} />
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="end_date" value={endDate} />
            <input type="hidden" name="pickup_time" value={pickupTime} />
            <input type="hidden" name="return_time" value={returnTime} />
            <input type="hidden" name="fulfillment_type" value={fulfillmentType} />
            {fulfillmentType === "Delivery" ? (
              <>
                <input
                  type="hidden"
                  name="delivery_address"
                  value={deliveryAddress}
                />
                <input
                  type="hidden"
                  name="return_delivery_address"
                  value={returnAddress}
                />
              </>
            ) : null}

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldCheck className="size-5 text-emerald-500" />
                Final Reservation Review
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please verify your booking details before submitting.
              </DialogDescription>
            </DialogHeader>

            {/* Vehicle Card */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={carName}
                className="size-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground text-sm">{carName}</p>
                <p className="text-xs text-muted-foreground">
                  {car.type || "Sedan"} • {car.transmission || "Auto"} • {car.fuel_type || "Gas"}
                </p>
                <p className="mt-0.5 text-[11px] text-[#ffcc00]">
                  Branch: {car.branches?.name ?? "Main Station"}
                </p>
              </div>
            </div>

            {/* Schedule Details Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Pick-up Window
                </span>
                <p className="mt-0.5 font-bold text-foreground">
                  {startDate} @ {pickupTime}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Return Window
                </span>
                <p className="mt-0.5 font-bold text-foreground">
                  {endDate} @ {returnTime}
                </p>
              </div>
            </div>

            {/* Fulfillment & Price Summary */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fulfillment</span>
                <span className="font-bold text-foreground">
                  {fulfillmentType === "Delivery"
                    ? `Delivery (${deliveryAddress})`
                    : `Pick-up (${car.branches?.name ?? "Branch"})`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-bold text-foreground">
                  {hours.toFixed(1)} hours
                </span>
              </div>
              <div className="border-t border-border/60 pt-2 flex items-center justify-between text-sm font-extrabold">
                <span>Estimated Rental Total</span>
                <span className="text-[#ffcc00]">
                  <Money value={calculatedPrice} />
                </span>
              </div>
            </div>

            {/* Upload verification (file input forwarding) */}
            <div className="space-y-2 border-t border-border/80 pt-3">
              <Label className="mb-1 block text-xs font-bold text-foreground">
                Attach Primary ID / Driver&apos;s License *
              </Label>
              <FileUploadDropzone
                name="primary_id"
                accept="image/*,.pdf"
                maxSizeMB={5}
                helperText="Required: Upload JPG, PNG or PDF of your driver's license."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border/80 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(fulfillmentType === "Delivery" ? 3 : 2)}
                className="text-xs"
              >
                Back
              </Button>
              <LoadingButton
                type="submit"
                className="bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633]"
              >
                <CheckCircle2 className="size-4" />
                Confirm & Submit Reservation
              </LoadingButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
