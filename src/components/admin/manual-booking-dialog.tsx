"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  PlusCircle,
  RotateCcw,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { LoadingButton } from "@/components/common/loading-button";
import { AvailabilityCalendar } from "@/components/common/availability-calendar";
import { PastDateConfirmDialog } from "@/components/common/past-date-confirm-dialog";
import { TimePicker } from "@/components/common/time-picker";
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
import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { calculatePriceByHours } from "@/lib/pricing";
import { addManualBookingAction } from "@/lib/actions/bookings";
import { formatPeso } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ManualCustomerOption = {
  id: number;
  name: string;
  email?: string | null;
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

const DRAFT_KEY = "instacar_manual_booking_draft_v1";

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
  const [customerType, setCustomerType] = useState<"registered" | "guest">("registered");
  const [userId, setUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [durationMode, setDurationMode] = useState<DurationMode>("custom");
  const [typeFilter, setTypeFilter] = useState("");
  const [carId, setCarId] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [pickupFee, setPickupFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [downPayment, setDownPayment] = useState("0");
  const [remarks, setRemarks] = useState("");

  // Fulfillment state
  const [fulfillmentType, setFulfillmentType] = useState<
    "Pickup" | "Delivery" | "Office Self-Pickup"
  >("Pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Searchable select state for registered members
  const [memberSearch, setMemberSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastConfirmOpen, setPastConfirmOpen] = useState(false);
  const [pastUnlocked, setPastUnlocked] = useState(false);
  const [inputPastConfirmOpen, setInputPastConfirmOpen] = useState(false);
  const [pendingInputDate, setPendingInputDate] = useState<{ field: "pickup" | "return"; value: string } | null>(null);

  const pastConfirmedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Restore draft from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.customerType) setCustomerType(d.customerType);
        if (d.userId) setUserId(d.userId);
        if (d.guestName) setGuestName(d.guestName);
        if (d.guestEmail) setGuestEmail(d.guestEmail);
        if (d.guestPhone) setGuestPhone(d.guestPhone);
        if (d.pickup) setPickup(d.pickup);
        if (d.returnAt) setReturnAt(d.returnAt);
        if (d.durationMode) setDurationMode(d.durationMode);
        if (d.typeFilter) setTypeFilter(d.typeFilter);
        if (d.carId) setCarId(d.carId);
        if (d.fulfillmentType) setFulfillmentType(d.fulfillmentType);
        if (d.deliveryAddress) setDeliveryAddress(d.deliveryAddress);
        if (d.deliveryFee) setDeliveryFee(d.deliveryFee);
        if (d.pickupFee) setPickupFee(d.pickupFee);
        if (d.discount) setDiscount(d.discount);
        if (d.downPayment) setDownPayment(d.downPayment);
        if (d.remarks) setRemarks(d.remarks);
      }
    } catch {}
  }, []);

  // Persist draft to localStorage whenever fields change
  useEffect(() => {
    if (!open) return;
    try {
      const draft = {
        customerType,
        userId,
        guestName,
        guestEmail,
        guestPhone,
        pickup,
        returnAt,
        durationMode,
        typeFilter,
        carId,
        fulfillmentType,
        deliveryAddress,
        deliveryFee,
        pickupFee,
        discount,
        downPayment,
        remarks,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    open,
    customerType,
    userId,
    guestName,
    guestEmail,
    guestPhone,
    pickup,
    returnAt,
    durationMode,
    typeFilter,
    carId,
    fulfillmentType,
    deliveryAddress,
    deliveryFee,
    pickupFee,
    discount,
    downPayment,
    remarks,
  ]);

  const handleResetForm = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    const stamp = Date.now();
    setCustomerType("registered");
    setUserId("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setPickup(toDateTimeInput(new Date(stamp)));
    setReturnAt(toDateTimeInput(new Date(stamp + 24 * 3_600_000)));
    setDurationMode(24);
    setTypeFilter("");
    setCarId("");
    setFulfillmentType("Pickup");
    setDeliveryAddress("");
    setDeliveryFee("0");
    setPickupFee("0");
    setDiscount("0");
    setDownPayment("0");
    setRemarks("");
    setPastUnlocked(false);
    pastConfirmedRef.current = false;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    }
    if (memberDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [memberDropdownOpen]);

  const filteredCustomers = useMemo(() => {
    if (!memberSearch.trim()) return customers;
    const q = memberSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.id).includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)),
    );
  }, [customers, memberSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === userId),
    [customers, userId],
  );

  /** Seed the schedule the first time the dialog opens if unset */
  const handleOpenChange = (next: boolean) => {
    setIsSubmitting(false);
    if (next) {
      const stamp = Date.now();
      if (!pickup) setPickup(toDateTimeInput(new Date(stamp)));
      if (!returnAt) {
        setReturnAt(toDateTimeInput(new Date(stamp + 10 * 3_600_000)));
      }
    }
    setOpen(next);
  };

  const carTypes = useMemo(
    () =>
      [...new Set(cars.map((car) => car.type).filter((type): type is string => !!type))].sort(),
    [cars],
  );

  const pickupDate = pickup ? pickup.slice(0, 10) : "";
  const pickupTime = pickup && pickup.length >= 16 ? pickup.slice(11, 16) : "10:00";
  const returnDate = returnAt ? returnAt.slice(0, 10) : "";
  const returnTime = returnAt && returnAt.length >= 16 ? returnAt.slice(11, 16) : "10:00";

  const changePickupDate = (newDate: string) => {
    const time = pickupTime || "10:00";
    const newPickup = `${newDate}T${time}`;
    setPickup(newPickup);
    if (durationMode === 10) {
      setReturnAt(addHours(newPickup, 10));
    } else if (durationMode === 24) {
      setReturnAt(addHours(newPickup, 24));
    } else {
      if (!returnDate || returnDate < newDate) {
        setReturnAt(`${newDate}T${returnTime || "10:00"}`);
      }
    }
  };

  const handlePickupDateChange = (newDate: string) => {
    if (!newDate) return;
    if (newDate < todayStr && !pastUnlocked) {
      setPendingInputDate({ field: "pickup", value: newDate });
      setInputPastConfirmOpen(true);
    } else {
      changePickupDate(newDate);
    }
  };

  const changePickupTime = (newTime: string) => {
    const d = pickupDate || todayStr;
    const newPickup = `${d}T${newTime}`;
    setPickup(newPickup);
    if (durationMode === 10) {
      setReturnAt(addHours(newPickup, 10));
    } else if (durationMode === 24) {
      setReturnAt(addHours(newPickup, 24));
    }
  };

  const changeReturnDate = (newDate: string) => {
    const time = returnTime || "10:00";
    setReturnAt(`${newDate}T${time}`);
    setDurationMode("custom");
  };

  const handleReturnDateChange = (newDate: string) => {
    if (!newDate) return;
    if (newDate < todayStr && !pastUnlocked) {
      setPendingInputDate({ field: "return", value: newDate });
      setInputPastConfirmOpen(true);
    } else {
      changeReturnDate(newDate);
    }
  };

  const handleConfirmInputPast = () => {
    setPastUnlocked(true);
    if (pendingInputDate) {
      if (pendingInputDate.field === "pickup") {
        changePickupDate(pendingInputDate.value);
      } else {
        changeReturnDate(pendingInputDate.value);
      }
    }
    setPendingInputDate(null);
    setInputPastConfirmOpen(false);
  };

  const changeReturnTime = (newTime: string) => {
    const d = returnDate || pickupDate || todayStr;
    setReturnAt(`${d}T${newTime}`);
  };

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
            const slotStart = new Date(slot.start).getTime();
            const slotEnd = new Date(slot.end).getTime();
            return startStamp < slotEnd && endStamp > slotStart;
          }),
        )
        .map((car) => car.id),
    );
  }, [cars, startStamp, endStamp]);

  const filteredCars = useMemo(() => {
    if (!typeFilter) return cars;
    return cars.filter((car) => car.type === typeFilter);
  }, [cars, typeFilter]);

  const selectedCar = useMemo(
    () => cars.find((car) => String(car.id) === carId),
    [cars, carId],
  );

  const isCarConflicted = !!selectedCar && conflictingCars.has(selectedCar.id);

  const basePrice =
    selectedCar && hours > 0
      ? calculatePriceByHours(
          hours,
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

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
  }, []);

  // A booking is in the past if pickup date or return date is before today in Manila.
  const isPastDate =
    (!!pickupDate && pickupDate < todayStr) ||
    (!!returnDate && returnDate < todayStr);
  const invalidRange = !!startStamp && !!endStamp && endStamp <= startStamp;
  const tooShort = hours > 0 && hours < 9.99;

  const durationText = invalidRange
    ? "Return must be after pickup time!"
    : tooShort
      ? `${hours.toFixed(1)} hrs (Min 10h)`
      : isCarConflicted
        ? "Selected car is unavailable for these dates. Please choose another."
        : hours > 0
          ? `${Math.ceil(hours)} Hours`
          : "0 Hours";

  const formValid =
    !!pickupDate &&
    !!returnDate &&
    !!selectedCar &&
    !isCarConflicted &&
    !invalidRange &&
    !tooShort &&
    hours >= 9.99 &&
    (customerType === "registered" ? !!userId : !!guestName.trim());

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
        <Button className="gap-2 font-bold shadow-xs">
          <PlusCircle className="size-4" />
          New Walk-in Booking
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] overflow-y-auto w-[95vw] sm:max-w-2xl md:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
            Create Walk-in Booking
          </DialogTitle>
          <DialogDescription>
            Register a new reservation or walk-in client.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={addManualBookingAction}
          onSubmit={(e) => {
            if (isSubmitting) {
              e.preventDefault();
              return;
            }
            if (isPastDate && !pastConfirmedRef.current) {
              e.preventDefault();
              setPastConfirmOpen(true);
              return;
            }
            setIsSubmitting(true);
            try {
              localStorage.removeItem(DRAFT_KEY);
            } catch {}
          }}
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
                <option value="guest">Walk-in / Guest</option>
              </select>
            </div>

            {customerType === "registered" ? (
              <div className="sm:col-span-2 relative" ref={memberDropdownRef}>
                <Label htmlFor="manual-user-id" className="mb-1 block text-xs font-bold">
                  Registered Member
                </Label>
                <input type="hidden" name="user_id" value={userId} />

                {/* Custom searchable member select */}
                <div
                  onClick={() => setMemberDropdownOpen((prev) => !prev)}
                  className={cn(
                    filterControlClass,
                    "flex items-center justify-between cursor-pointer",
                    !userId && "text-muted-foreground",
                  )}
                >
                  <span className="truncate">
                    {selectedCustomer
                      ? `${selectedCustomer.name} (ID: #${selectedCustomer.id}${
                          selectedCustomer.email ? ` • ${selectedCustomer.email}` : ""
                        })`
                      : "-- Search or Select Registered Member --"}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground opacity-60" />
                </div>

                {memberDropdownOpen ? (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover p-2 shadow-xl animate-in fade-in-0 zoom-in-95">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Type name, email, or member ID..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        autoFocus
                        className="pl-8 pr-7 h-8 text-xs rounded-lg"
                      />
                      {memberSearch ? (
                        <button
                          type="button"
                          onClick={() => setMemberSearch("")}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => {
                          const isSelected = String(customer.id) === userId;
                          return (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setUserId(String(customer.id));
                                setMemberDropdownOpen(false);
                                setMemberSearch("");
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left",
                                isSelected
                                  ? "bg-[#ffcc00] font-bold text-black"
                                  : "hover:bg-muted text-foreground",
                              )}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{customer.name}</p>
                                <p
                                  className={cn(
                                    "text-[10px]",
                                    isSelected ? "text-black/80" : "text-muted-foreground",
                                  )}
                                >
                                  Member ID: #{customer.id}
                                  {customer.email ? ` • ${customer.email}` : ""}
                                </p>
                              </div>
                              {isSelected ? <Check className="size-4 shrink-0 text-black" /> : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No matching registered members found.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
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
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
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
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="rounded-lg"
                  />
                </div>
              </>
            )}

            <div>
              <FileUploadDropzone
                name="primary_id"
                label="Primary ID"
                required
                accept="image/*,.pdf"
                helperText="JPG, PNG, or PDF (Max 5MB)"
              />
            </div>

            <div>
              <FileUploadDropzone
                name="secondary_id"
                label="Secondary ID (optional)"
                required={false}
                accept="image/*,.pdf"
                helperText="JPG, PNG, or PDF (Max 5MB)"
              />
            </div>

            <div className="sm:col-span-2">
              <FileUploadDropzone
                name="proof_of_billing"
                label="Proof of Billing"
                required
                accept="image/*,.pdf"
                helperText="Utility bill, statement, etc. (Max 5MB)"
              />
            </div>

            {/* Interactive Availability Calendar */}
            <div className="sm:col-span-2">
              <AvailabilityCalendar
                startDate={pickupDate || undefined}
                endDate={returnDate || undefined}
                blockedRanges={
                  selectedCar
                    ? selectedCar.busySlots.map((s) => ({
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
                  setPickup(`${startDay}T${pTime}`);
                  setReturnAt(`${endDay}T${rTime}`);
                  setDurationMode("custom");
                }}
              />
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

            {/* Stylized Time Selection UI */}
            <div>
              <Label htmlFor="manual-pickup-date" className="mb-1 block text-xs font-bold">
                Pickup Date
              </Label>
              <Input
                id="manual-pickup-date"
                type="date"
                value={pickupDate}
                onChange={(event) => handlePickupDateChange(event.target.value)}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="manual-pickup-time" className="mb-1 block text-xs font-bold">
                Pickup Time
              </Label>
              <TimePicker
                id="manual-pickup-time"
                value={pickupTime}
                onChange={(newTime) => changePickupTime(newTime)}
              />
            </div>

            <div>
              <Label htmlFor="manual-return-date" className="mb-1 block text-xs font-bold">
                Return Date
              </Label>
              <Input
                id="manual-return-date"
                type="date"
                value={returnDate}
                onChange={(event) => handleReturnDateChange(event.target.value)}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="manual-return-time" className="mb-1 block text-xs font-bold">
                Return Time
              </Label>
              <TimePicker
                id="manual-return-time"
                value={returnTime}
                onChange={(newTime) => changeReturnTime(newTime)}
              />
            </div>

            {/* Hidden fields passed to server action */}
            <input type="hidden" name="start_date" value={pickupDate} />
            <input type="hidden" name="pickup_time" value={pickupTime} />
            <input type="hidden" name="end_date" value={returnDate} />
            <input type="hidden" name="return_time" value={returnTime} />

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
                id="manual-car-id"
                name="car_id"
                value={carId}
                onChange={(event) => setCarId(event.target.value)}
                required
                className={filterControlClass}
              >
                <option value="">-- Select Vehicle --</option>
                {filteredCars.map((car) => {
                  const conflicted = conflictingCars.has(car.id);
                  return (
                    <option key={car.id} value={car.id} disabled={conflicted}>
                      {carLabel(car)}
                      {conflicted ? " (UNAVAILABLE - Already Booked)" : ""}
                    </option>
                  );
                })}
              </select>
              {isCarConflicted ? (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  This car has an overlapping booking for the selected dates. Please choose another car or adjust the dates.
                </p>
              ) : null}
              {isPastDate ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  Pickup date is in the past. Proceeding will record a past-dated booking.
                </p>
              ) : null}
            </div>

            {/* Fulfillment Type */}
            <div className="sm:col-span-2">
              <Label htmlFor="manual-fulfillment" className="mb-1 block text-xs font-bold">
                Fulfillment Type
              </Label>
              <select
                id="manual-fulfillment"
                name="fulfillment_type"
                value={fulfillmentType}
                onChange={(event) =>
                  setFulfillmentType(
                    event.target.value as "Pickup" | "Delivery" | "Office Self-Pickup",
                  )
                }
                className={filterControlClass}
              >
                <option value="Pickup">Pickup at Office</option>
                <option value="Delivery">Doorstep Delivery</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="manual-delivery-address" className="mb-1 block text-xs font-bold">
                {fulfillmentType === "Delivery" ? "Delivery Address *" : "Pickup / Branch Address"}
              </Label>
              <Input
                id="manual-delivery-address"
                type="text"
                name="delivery_address"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder={
                  fulfillmentType === "Delivery"
                    ? "Enter customer delivery & drop-off address"
                    : "Pickup address or branch location (optional)"
                }
                required={fulfillmentType === "Delivery"}
                className="rounded-lg"
              />
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
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
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

          <DialogFooter className="flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetForm}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset Form
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton
                type="submit"
                disabled={!formValid || isSubmitting}
                loading={isSubmitting}
                loadingText="Confirming Booking..."
                className="rounded-lg px-5 font-bold bg-[#ffcc00] text-black hover:bg-[#e6b800] shadow-sm"
              >
                Confirm Booking
              </LoadingButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Step 1 Past Date Input Confirmation Modal */}
      <PastDateConfirmDialog
        open={inputPastConfirmOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setInputPastConfirmOpen(false);
            setPendingInputDate(null);
          }
        }}
        onConfirm={handleConfirmInputPast}
        title="Past Date Selection"
        message="You are selecting a past date. Are you sure?"
      />

      {/* Step 3 Final Submit Confirmation Modal */}
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
