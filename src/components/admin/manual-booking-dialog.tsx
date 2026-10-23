"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Car,
  CircleDollarSign,
  PlusCircle,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterControlClass } from "@/components/common/filter-bar";
import { calculatePriceByHours } from "@/lib/pricing";
import { addManualBookingAction } from "@/lib/actions/bookings";
import { formatPeso } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ManualCustomerOption = {
  id: number;
  name: string;
};

export type BusySlot = {
  start: string;
  end: string;
};

export type ManualCarOption = {
  id: number;
  brand: string | null;
  model: string | null;
  plate_number: string | null;
  type: string | null;
  price_10_hours: number | null;
  price_12_hours: number | null;
  price_24_hours: number | null;
  ext_price_1_6: number | null;
  ext_price_7_10: number | null;
  ext_price_11_12: number | null;
  ext_price_13_24: number | null;
  busySlots: BusySlot[];
};

type DurationMode = "custom" | 10 | 24;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** `datetime-local` value in the browser timezone. */
function toDateTimeInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addHours(value: string, hours: number) {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return value;
  return toDateTimeInput(new Date(start.getTime() + hours * 3_600_000));
}

function amount(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function carLabel(car: ManualCarOption) {
  const name = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
  return `${name} (${car.plate_number ?? "no plate"})`;
}

/**
 * "Create Walk-in Booking" dialog — port of `#manualBookingModal` from
 * `bookings_manual.php`, including the client-side tier calculator and the
 * busy-slot conflict disabling of the car picker.
 */
export function ManualBookingDialog({
  customers,
  cars,
}: {
  customers: ManualCustomerOption[];
  cars: ManualCarOption[];
}) {
  const [open, setOpen] = useState(false);
  const [customerType, setCustomerType] = useState<"registered" | "guest">(
    "registered",
  );
  const [userId, setUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [pickup, setPickup] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [durationMode, setDurationMode] = useState<DurationMode>("custom");
  const [typeFilter, setTypeFilter] = useState("");
  const [carId, setCarId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [pickupFee, setPickupFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [downPayment, setDownPayment] = useState("0");
  const [now, setNow] = useState(0);

  /** Seed the schedule the first time the dialog opens (legacy defaults to now + 10h). */
  const handleOpenChange = (next: boolean) => {
    if (next) {
      const stamp = Date.now();
      setNow(stamp);
      if (!pickup) setPickup(toDateTimeInput(new Date(stamp)));
      if (!returnAt) {
        setReturnAt(toDateTimeInput(new Date(stamp + 10 * 3_600_000)));
      }
    }
    setOpen(next);
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const carTypes = useMemo(
    () =>
      [...new Set(cars.map((car) => car.type).filter((type): type is string => !!type))].sort(),
    [cars],
  );

  const hours = useMemo(() => {
    if (!pickup || !returnAt) return 0;
    const start = new Date(pickup).getTime();
    const end = new Date(returnAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return (end - start) / 3_600_000;
  }, [pickup, returnAt]);

  const startStamp = pickup ? new Date(pickup).getTime() : 0;
  const endStamp = returnAt ? new Date(returnAt).getTime() : 0;

  const conflictingCars = useMemo(() => {
    if (!startStamp || !endStamp || endStamp <= startStamp) return new Set<number>();

    return new Set(
      cars
        .filter((car) =>
          car.busySlots.some((slot) => {
            const busyStart = new Date(slot.start).getTime();
            const busyEnd = new Date(slot.end).getTime();
            if (!Number.isFinite(busyStart) || !Number.isFinite(busyEnd)) return false;
            return startStamp < busyEnd && endStamp > busyStart;
          }),
        )
        .map((car) => car.id),
    );
  }, [cars, startStamp, endStamp]);

  const selectedCar =
    cars.find(
      (car) =>
        String(car.id) === carId &&
        (!typeFilter || car.type === typeFilter) &&
        !conflictingCars.has(car.id),
    ) ?? null;

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

  const discountValue = amount(discount);
  const downPaymentValue = amount(downPayment);
  const balance = Math.max(0, basePrice - discountValue - downPaymentValue);

  const pickupInPast = now > 0 && !!startStamp && startStamp < now - 60_000;
  const invalidRange = !!startStamp && !!endStamp && endStamp <= startStamp;
  const tooShort = hours > 0 && hours < 9.99;

  const durationText = invalidRange
    ? "Return must be after pickup time!"
    : pickupInPast
      ? "Pickup time cannot be in the past!"
      : tooShort
        ? `${hours.toFixed(1)} hrs (Min 10h)`
        : hours > 0
          ? `${Math.ceil(hours)} Hours`
          : "0 Hours";

  const formValid =
    !!pickup &&
    !!returnAt &&
    !!selectedCar &&
    !pickupInPast &&
    !invalidRange &&
    !tooShort &&
    hours >= 9.99;

  const chooseDuration = (mode: DurationMode) => {
    setDurationMode(mode);
    if (mode !== "custom" && pickup) {
      setReturnAt(addHours(pickup, mode));
    }
  };

  const changePickup = (value: string) => {
    setPickup(value);
    if (durationMode !== "custom" && value) {
      setReturnAt(addHours(value, durationMode));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-bold">
          <PlusCircle className="size-4" />
          New Walk-in Booking
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <UserRound className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
            Create Walk-in Booking
          </DialogTitle>
          <DialogDescription>
            Register a new reservation or walk-in client.
          </DialogDescription>
        </DialogHeader>

        <form
          action={addManualBookingAction}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="manual-customer-type" className="mb-1 block text-xs font-bold">
                Customer Type
              </Label>
              <select
                id="manual-customer-type"
                name="customer_type"
                value={customerType}
                onChange={(event) =>
                  setCustomerType(event.target.value as "registered" | "guest")
                }
                className={filterControlClass}
              >
                <option value="registered">Registered Member</option>
                <option value="guest">Guest / Walk-in</option>
              </select>
            </div>

            {customerType === "registered" ? (
              <div className="sm:col-span-2">
                <Label htmlFor="manual-member" className="mb-1 block text-xs font-bold">
                  Select Member
                </Label>
                <select
                  id="manual-member"
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
                  <Label htmlFor="manual-guest-name" className="mb-1 block text-xs font-bold">
                    Guest Full Name
                  </Label>
                  <Input
                    id="manual-guest-name"
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
                  <Label htmlFor="manual-guest-email" className="mb-1 block text-xs font-bold">
                    Email
                  </Label>
                  <Input
                    id="manual-guest-email"
                    type="email"
                    name="guest_email"
                    placeholder="email@gmail.com"
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-guest-phone" className="mb-1 block text-xs font-bold">
                    Phone
                  </Label>
                  <Input
                    id="manual-guest-phone"
                    type="text"
                    name="guest_phone"
                    placeholder="09xxxxxxxxx"
                    className="rounded-lg"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="manual-primary" className="mb-1 block text-xs font-bold">
                Primary ID <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="manual-primary"
                type="file"
                name="primary_id"
                accept="image/*,.pdf"
                required
                className="cursor-pointer rounded-lg file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-semibold"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">JPG, PNG, or PDF</p>
            </div>

            <div>
              <Label htmlFor="manual-secondary" className="mb-1 block text-xs font-bold">
                Secondary ID <span className="font-medium text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="manual-secondary"
                type="file"
                name="secondary_id"
                accept="image/*,.pdf"
                className="cursor-pointer rounded-lg file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="manual-billing" className="mb-1 block text-xs font-bold">
                Proof of Billing <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="manual-billing"
                type="file"
                name="proof_of_billing"
                accept="image/*,.pdf"
                required
                className="cursor-pointer rounded-lg file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-semibold"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Utility bill, statement, etc.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1 block text-xs font-bold">Quick Duration</Label>
              <div className="grid grid-cols-3 gap-2">
                {([10, 24, "custom"] as const).map((mode) => {
                  const active = durationMode === mode;
                  return (
                    <button
                      key={String(mode)}
                      type="button"
                      onClick={() => chooseDuration(mode)}
                      className={cn(
                        "rounded-[10px] border px-3 py-2 text-xs font-semibold transition-colors",
                        active
                          ? "border-[#ffcc00] bg-[#ffcc00] font-bold text-black"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {mode === "custom" ? "Custom" : `${mode} Hours`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="manual-pickup" className="mb-1 block text-xs font-bold">
                Pickup Date &amp; Time
              </Label>
              <Input
                id="manual-pickup"
                type="datetime-local"
                value={pickup}
                onChange={(event) => changePickup(event.target.value)}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="manual-return" className="mb-1 block text-xs font-bold">
                Return Date &amp; Time
              </Label>
              <Input
                id="manual-return"
                type="datetime-local"
                value={returnAt}
                onChange={(event) => setReturnAt(event.target.value)}
                readOnly={durationMode !== "custom"}
                required
                className="rounded-lg"
              />
            </div>

            <input type="hidden" name="start_date" value={pickup.slice(0, 10)} />
            <input type="hidden" name="pickup_time" value={pickup.slice(11, 16)} />
            <input type="hidden" name="end_date" value={returnAt.slice(0, 10)} />
            <input type="hidden" name="return_time" value={returnAt.slice(11, 16)} />

            <div className="sm:col-span-2">
              <Label htmlFor="manual-type-filter" className="mb-1 block text-xs font-bold">
                Vehicle Type &amp; Selection
              </Label>
              <select
                id="manual-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={cn(filterControlClass, "mb-2")}
              >
                <option value="">All Types / Categories</option>
                {carTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                id="manual-car"
                name="car_id"
                value={selectedCar ? String(selectedCar.id) : ""}
                onChange={(event) => setCarId(event.target.value)}
                required
                className={filterControlClass}
              >
                <option value="">-- Select a Car --</option>
                {cars
                  .filter((car) => !typeFilter || car.type === typeFilter)
                  .map((car) => {
                    const conflict = conflictingCars.has(car.id);
                    return (
                      <option key={car.id} value={car.id} disabled={conflict}>
                        {carLabel(car)} — {formatPeso(Number(car.price_24_hours ?? 0))}/24h
                        {conflict ? " (NOT AVAILABLE)" : ""}
                      </option>
                    );
                  })}
              </select>

              <p
                className={cn(
                  "mt-1.5 text-[11px] font-semibold",
                  pickupInPast || invalidRange || tooShort
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground",
                )}
              >
                {durationText}
              </p>
            </div>

            <div>
              <Label htmlFor="manual-delivery-fee" className="mb-1 block text-xs font-bold">
                Delivery Fee (₱)
              </Label>
              <Input
                id="manual-delivery-fee"
                type="number"
                name="delivery_fee"
                min={0}
                step="0.01"
                value={deliveryFee}
                onChange={(event) => setDeliveryFee(event.target.value)}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="manual-pickup-fee" className="mb-1 block text-xs font-bold">
                Pickup Fee (₱)
              </Label>
              <Input
                id="manual-pickup-fee"
                type="number"
                name="pickup_fee"
                min={0}
                step="0.01"
                value={pickupFee}
                onChange={(event) => setPickupFee(event.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="manual-remarks" className="mb-1 block text-xs font-bold">
                Notes / Remarks
              </Label>
              <textarea
                id="manual-remarks"
                name="remarks"
                rows={2}
                placeholder="Enter any special instructions or notes..."
                className={cn(filterControlClass, "h-auto min-h-[66px] py-2")}
              />
            </div>

            <div>
              <Label htmlFor="manual-discount" className="mb-1 block text-xs font-bold">
                Discount (₱)
              </Label>
              <Input
                id="manual-discount"
                type="number"
                name="discount_price"
                min={0}
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="manual-down-payment" className="mb-1 block text-xs font-bold">
                Down Payment (₱)
              </Label>
              <Input
                id="manual-down-payment"
                type="number"
                name="down_payment"
                min={0}
                step="0.01"
                value={downPayment}
                onChange={(event) => setDownPayment(event.target.value)}
                className="rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sky-900 dark:text-sky-100">
                    Base Rental Rate
                  </span>
                  <strong className="tabular-nums text-sky-900 dark:text-sky-100">
                    {formatPeso(basePrice)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300">
                  <span className="font-semibold">Discount Deduction</span>
                  <strong className="tabular-nums">-{formatPeso(discountValue)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                  <span className="font-semibold">Down Payment Paid</span>
                  <strong className="tabular-nums">-{formatPeso(downPaymentValue)}</strong>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-sky-200 pt-2 dark:border-sky-900">
                  <div>
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-sky-800 dark:text-sky-200">
                      Remaining Balance
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-200/70 px-2 py-0.5 text-[10px] font-bold text-sky-900 dark:bg-sky-900/60 dark:text-sky-100">
                      <CalendarDays className="size-3" />
                      {durationText}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xl font-black tabular-nums text-sky-950 dark:text-sky-50">
                    <CircleDollarSign className="size-4" />
                    {formatPeso(balance)}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-sky-700 dark:text-sky-300">
                  <Car className="size-3.5" />
                  The server recalculates the stored total from the car tier prices.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!formValid} className="rounded-lg px-4 font-bold">
              Confirm Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
