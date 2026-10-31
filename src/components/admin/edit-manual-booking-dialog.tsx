"use client";

import { useMemo, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";

import { DocumentPreviewButton, type BookingDocument } from "@/components/admin/document-preview";
import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/common/loading-button";
import { AvailabilityCalendar } from "@/components/common/availability-calendar";
import { PastDateConfirmDialog } from "@/components/common/past-date-confirm-dialog";
import { TimePicker } from "@/components/common/time-picker";
import { useSlowNetworkStatus, SlowNetworkFeedback } from "@/components/common/slow-network-feedback";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterControlClass } from "@/components/common/filter-bar";
import { updateBookingAction } from "@/lib/actions/bookings";
import { calculatePriceByHours } from "@/lib/pricing";
import { formatPeso } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type EditableManualBooking = {
  id: number;
  user_id: number | null;
  guest_name: string | null;
  gmail: string | null;
  phone_number: string | null;
  car_id: number | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
  discount_price: number | null;
  down_payment: number | null;
  delivery_fee: number | null;
  pickup_fee: number | null;
  remarks: string | null;
};

export type ManualEditCustomer = {
  id: number;
  name: string;
};

export type ManualEditCar = {
  id: number;
  brand: string | null;
  model: string | null;
  plate_number: string | null;
  price_10_hours: number | null;
  price_12_hours: number | null;
  price_24_hours: number | null;
  ext_price_1_6: number | null;
  ext_price_7_10: number | null;
  ext_price_11_12: number | null;
  ext_price_13_24: number | null;
  busySlots?: { start: string; end: string }[];
};

function combineDateTime(date: string | null, time: string | null) {
  if (!date) return "";
  const t = time && time.length >= 5 ? time.slice(0, 5) : "00:00";
  return `${date}T${t}`;
}

function splitDateTime(value: string) {
  if (!value.includes("T")) return { date: value.slice(0, 10), time: "00:00" };
  const [d, t] = value.split("T");
  return { date: d, time: (t || "00:00").slice(0, 5) };
}

function carLabel(car: ManualEditCar) {
  const name = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  return `${name} (${car.plate_number ?? "no plate"})`;
}

function UploadField({
  name,
  label,
  document,
}: {
  id?: string;
  name: string;
  label: string;
  document?: BookingDocument;
}) {
  return (
    <FileUploadDropzone
      name={name}
      label={label}
      existingUrl={document?.url ?? null}
      accept="image/*,application/pdf"
      helperText="Drag & drop file or click to browse (Max 5MB)"
    />
  );
}

export function EditManualBookingDialog({
  open,
  onOpenChange,
  booking,
  filter,
  documents,
  customers,
  cars,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: EditableManualBooking;
  filter: string;
  documents: BookingDocument[];
  customers: ManualEditCustomer[];
  cars: ManualEditCar[];
}) {
  const isRegistered = booking.user_id != null;
  const [customerType, setCustomerType] = useState<"registered" | "guest">(isRegistered ? "registered" : "guest");
  const [userId, setUserId] = useState<string>(booking.user_id ? String(booking.user_id) : "");
  const [guestName, setGuestName] = useState<string>(booking.guest_name ?? "");
  const [guestEmail, setGuestEmail] = useState<string>(booking.gmail ?? "");
  const [guestPhone, setGuestPhone] = useState<string>(booking.phone_number ?? "");
  const [carId, setCarId] = useState<string>(booking.car_id ? String(booking.car_id) : "");
  const [pickupDatetime, setPickupDatetime] = useState<string>(combineDateTime(booking.start_date, booking.pickup_time));
  const [returnDatetime, setReturnDatetime] = useState<string>(combineDateTime(booking.end_date, booking.return_time));
  const [deliveryFee, setDeliveryFee] = useState<string>(String(booking.delivery_fee ?? 0));
  const [pickupFee, setPickupFee] = useState<string>(String(booking.pickup_fee ?? 0));
  const [discount, setDiscount] = useState<string>(String(booking.discount_price ?? 0));
  const [downPayment, setDownPayment] = useState<string>(String(booking.down_payment ?? 0));
  const [remarks, setRemarks] = useState<string>(booking.remarks ?? "");
  const [pastConfirmOpen, setPastConfirmOpen] = useState(false);
  const [pastUnlocked, setPastUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const networkStatus = useSlowNetworkStatus(isSubmitting);
  const pastConfirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedCar = useMemo(() => cars.find((car) => String(car.id) === carId) ?? null, [cars, carId]);

  const hours = useMemo(() => {
    if (!pickupDatetime || !returnDatetime) return 0;
    const start = new Date(pickupDatetime).getTime();
    const end = new Date(returnDatetime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return (end - start) / 3_600_000;
  }, [pickupDatetime, returnDatetime]);

  const basePrice =
    selectedCar && hours > 0
      ? calculatePriceByHours(
          Math.ceil(hours),
          Number(selectedCar.price_10_hours ?? 0),
          Number(selectedCar.price_12_hours ?? 0),
          Number(selectedCar.price_24_hours ?? 0),
          Number(selectedCar.ext_price_1_6 ?? 0),
          Number(selectedCar.ext_price_7_10 ?? 0),
          Number(selectedCar.ext_price_11_12 ?? 0),
          Number(selectedCar.ext_price_13_24 ?? 0),
        )
      : 0;

  const MAX_ALLOWED_AMOUNT = 1_000_000;

  const handleNumericInput =
    (setter: (val: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === "") {
        setter("");
        return;
      }
      const num = parseFloat(raw);
      if (!isNaN(num) && num > MAX_ALLOWED_AMOUNT) {
        setter(String(MAX_ALLOWED_AMOUNT));
        return;
      }
      setter(raw);
    };

  const discountValue = Number.parseFloat(discount) || 0;
  const downPaymentValue = Number.parseFloat(downPayment) || 0;
  const deliveryFeeValue = Number.parseFloat(deliveryFee) || 0;
  const pickupFeeValue = Number.parseFloat(pickupFee) || 0;
  const balance = Math.max(0, basePrice - discountValue - downPaymentValue);

  const isAmountsValid =
    deliveryFeeValue <= MAX_ALLOWED_AMOUNT &&
    pickupFeeValue <= MAX_ALLOWED_AMOUNT &&
    discountValue <= MAX_ALLOWED_AMOUNT &&
    downPaymentValue <= MAX_ALLOWED_AMOUNT;

  const formValid =
    !!pickupDatetime &&
    !!returnDatetime &&
    !!selectedCar &&
    isAmountsValid &&
    new Date(returnDatetime).getTime() > new Date(pickupDatetime).getTime() &&
    (customerType === "guest" ? !!guestName.trim() : !!userId);

  const { date: startDate, time: pickupTime } = splitDateTime(pickupDatetime);
  const { date: endDate, time: returnTime } = splitDateTime(returnDatetime);

  const handleConfirmSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formValid || isSubmitting) return;

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

    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-8 w-[95vw] sm:max-w-3xl">
        <DialogHeader className="border-b border-border/80 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
            Edit Booking
          </DialogTitle>
          <DialogDescription>
            Booking <span className="font-semibold text-foreground">#BK-{booking.id}</span> · update customer, schedule, vehicle and charges.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={updateBookingAction}
          onSubmit={(e) => {
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
          }}
          className="space-y-4"
        >
          <input type="hidden" name="booking_id" value={booking.id} />
          <input type="hidden" name="source" value="manual" />
          <input type="hidden" name="filter" value={filter} />
          <input type="hidden" name="pickup_datetime" value={pickupDatetime.replace("T", " ")} />
          <input type="hidden" name="return_datetime" value={returnDatetime.replace("T", " ")} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor={`edit-manual-customer-type-${booking.id}`} className="mb-1 block text-xs font-bold">
                Customer Type
              </Label>
              <select
                id={`edit-manual-customer-type-${booking.id}`}
                name="customer_type"
                value={customerType}
                onChange={(event) => setCustomerType(event.target.value as "registered" | "guest")}
                className={filterControlClass}
              >
                <option value="registered">Registered Member</option>
                <option value="guest">Guest / Walk-in</option>
              </select>
            </div>

            {customerType === "registered" ? (
              <div className="sm:col-span-2">
                <Label htmlFor={`edit-manual-member-${booking.id}`} className="mb-1 block text-xs font-bold">
                  Select Member
                </Label>
                <select
                  id={`edit-manual-member-${booking.id}`}
                  name="user_id"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  required
                  className={filterControlClass}
                >
                  <option value="">-- Select Member --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <Label htmlFor={`edit-manual-guest-name-${booking.id}`} className="mb-1 block text-xs font-bold">
                    Guest Full Name
                  </Label>
                  <Input
                    id={`edit-manual-guest-name-${booking.id}`}
                    type="text"
                    name="guest_name"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="Enter Full Name"
                    required
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor={`edit-manual-guest-email-${booking.id}`} className="mb-1 block text-xs font-bold">
                    Email
                  </Label>
                  <Input
                    id={`edit-manual-guest-email-${booking.id}`}
                    type="email"
                    name="guest_email"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    placeholder="email@gmail.com"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor={`edit-manual-guest-phone-${booking.id}`} className="mb-1 block text-xs font-bold">
                    Phone
                  </Label>
                  <Input
                    id={`edit-manual-guest-phone-${booking.id}`}
                    type="text"
                    name="guest_phone"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="rounded-lg"
                  />
                </div>
              </>
            )}

            <UploadField
              id={`edit-manual-primary-${booking.id}`}
              name="primary_id"
              label="Primary ID"
              document={documents.find((document) => document.key === "primary")}
            />
            <UploadField
              id={`edit-manual-secondary-${booking.id}`}
              name="secondary_id"
              label="Secondary ID"
              document={documents.find((document) => document.key === "secondary")}
            />
            <div className="sm:col-span-2">
              <UploadField
                id={`edit-manual-billing-${booking.id}`}
                name="proof_of_billing"
                label="Proof of Billing"
                document={documents.find((document) => document.key === "billing")}
              />
            </div>

            {/* Availability Calendar (Screenshot 1 & 2) */}
            <div className="sm:col-span-2">
              <AvailabilityCalendar
                startDate={startDate}
                endDate={endDate}
                blockedRanges={
                  selectedCar?.busySlots
                    ? selectedCar.busySlots
                        .filter((s: { start: string; end: string }) => !s.start.startsWith(booking.start_date || "___"))
                        .map((s: { start: string; end: string }) => ({
                          start: s.start.slice(0, 10),
                          end: s.end.slice(0, 10),
                          reason: "Booked",
                        }))
                    : []
                }
                allowPastDates={true}
                pastUnlocked={pastUnlocked}
                onUnlockPast={() => setPastUnlocked(true)}
                onSelectRange={(startDay, endDay) => {
                  const pTime = pickupTime || "10:00";
                  const rTime = returnTime || "10:00";
                  setPickupDatetime(`${startDay}T${pTime}`);
                  setReturnDatetime(`${endDay}T${rTime}`);
                }}
              />
            </div>

            <div>
              <Label htmlFor={`edit-manual-pickup-date-${booking.id}`} className="mb-1 block text-xs font-bold">
                Pickup Date
              </Label>
              <Input
                id={`edit-manual-pickup-date-${booking.id}`}
                type="date"
                value={startDate}
                onChange={(event) => {
                  const d = event.target.value;
                  const t = pickupTime || "10:00";
                  setPickupDatetime(`${d}T${t}`);
                }}
                required
                className="rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor={`edit-manual-pickup-time-${booking.id}`} className="mb-1 block text-xs font-bold">
                Pickup Time
              </Label>
              <TimePicker
                id={`edit-manual-pickup-time-${booking.id}`}
                value={pickupTime}
                onChange={(newTime) => {
                  const d = startDate || new Date().toISOString().slice(0, 10);
                  setPickupDatetime(`${d}T${newTime}`);
                }}
              />
            </div>

            <div>
              <Label htmlFor={`edit-manual-return-date-${booking.id}`} className="mb-1 block text-xs font-bold">
                Return Date
              </Label>
              <Input
                id={`edit-manual-return-date-${booking.id}`}
                type="date"
                value={endDate}
                onChange={(event) => {
                  const d = event.target.value;
                  const t = returnTime || "10:00";
                  setReturnDatetime(`${d}T${t}`);
                }}
                required
                className="rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor={`edit-manual-return-time-${booking.id}`} className="mb-1 block text-xs font-bold">
                Return Time
              </Label>
              <TimePicker
                id={`edit-manual-return-time-${booking.id}`}
                value={returnTime}
                onChange={(newTime) => {
                  const d = endDate || startDate || new Date().toISOString().slice(0, 10);
                  setReturnDatetime(`${d}T${newTime}`);
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor={`edit-manual-car-${booking.id}`} className="mb-1 block text-xs font-bold">
                Vehicle
              </Label>
              <select
                id={`edit-manual-car-${booking.id}`}
                name="car_id"
                value={carId}
                onChange={(event) => setCarId(event.target.value)}
                required
                className={filterControlClass}
              >
                <option value="">-- Select a Car --</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {carLabel(car)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Duration: {hours > 0 ? `${hours.toFixed(1)} hrs` : "0 hrs"} · Base: {formatPeso(basePrice)}
              </p>
            </div>

            <div>
              <Label htmlFor={`edit-manual-delivery-${booking.id}`} className="mb-1 block text-xs font-bold">
                Delivery Fee (₱)
              </Label>
              <Input
                id={`edit-manual-delivery-${booking.id}`}
                type="number"
                name="delivery_fee"
                min={0}
                max={MAX_ALLOWED_AMOUNT}
                step="0.01"
                value={deliveryFee}
                onChange={handleNumericInput(setDeliveryFee)}
                className="rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor={`edit-manual-pickup-fee-${booking.id}`} className="mb-1 block text-xs font-bold">
                Pickup Fee (₱)
              </Label>
              <Input
                id={`edit-manual-pickup-fee-${booking.id}`}
                type="number"
                name="pickup_fee"
                min={0}
                max={MAX_ALLOWED_AMOUNT}
                step="0.01"
                value={pickupFee}
                onChange={handleNumericInput(setPickupFee)}
                className="rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor={`edit-manual-remarks-${booking.id}`} className="mb-1 block text-xs font-bold">
                Notes / Remarks
              </Label>
              <textarea
                id={`edit-manual-remarks-${booking.id}`}
                name="remarks"
                rows={2}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Enter any special instructions or notes..."
                className={cn(filterControlClass, "h-auto min-h-[66px] py-2")}
              />
            </div>

            <div>
              <Label htmlFor={`edit-manual-discount-${booking.id}`} className="mb-1 block text-xs font-bold">
                Discount (₱)
              </Label>
              <Input
                id={`edit-manual-discount-${booking.id}`}
                type="number"
                name="discount_price"
                min={0}
                max={MAX_ALLOWED_AMOUNT}
                step="0.01"
                value={discount}
                onChange={handleNumericInput(setDiscount)}
                className="rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor={`edit-manual-down-${booking.id}`} className="mb-1 block text-xs font-bold">
                Down Payment (₱)
              </Label>
              <Input
                id={`edit-manual-down-${booking.id}`}
                type="number"
                name="down_payment"
                min={0}
                max={MAX_ALLOWED_AMOUNT}
                step="0.01"
                value={downPayment}
                onChange={handleNumericInput(setDownPayment)}
                className="rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Estimated Balance (Base - Discount - Down)</p>
                  <p className="text-lg font-black tabular-nums">{formatPeso(balance)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Base: {formatPeso(basePrice)}</p>
                  <p>Start: {startDate} {pickupTime} · End: {endDate} {returnTime}</p>
                </div>
              </div>
            </div>
          </div>

          <SlowNetworkFeedback status={networkStatus} className="w-full my-1.5" />

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              type="button"
              onClick={handleConfirmSaveClick}
              disabled={!formValid || isSubmitting}
              loading={isSubmitting}
              loadingText="Saving Changes..."
              className="rounded-lg px-4 font-bold bg-[#ffcc00] text-black hover:bg-[#e6b800]"
            >
              Save Changes
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>

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
    </Dialog>
  );
}
