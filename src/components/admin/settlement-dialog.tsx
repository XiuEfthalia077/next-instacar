"use client";

import { useState } from "react";
import { CalendarClock, Info, Receipt } from "lucide-react";

import { dateOnly, peso } from "@/components/admin/finance-format";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/common/loading-button";
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
import { Textarea } from "@/components/ui/textarea";
import { savePaymentAction } from "@/lib/actions/bookings";
import type { PendingSettlement } from "@/lib/data/finance";
import { cn } from "@/lib/utils";

/**
 * Settlement modal — port of `#payModal{id}` in
 * `car-rental/pages/admin/settlements.php`.
 *
 * The live gross / net preview uses the exact same formula as
 * `savePaymentAction()`:
 *
 *   gross = daily_rent + extension_fee + delivery_fee + pickup_fee +
 *           damage_fee + others + carwash + fuel + driver_fee
 *   net   = gross - jer_delivery_fee - jer_pickup_fee - agent_fee
 *
 * Overtime follows the legacy `autoCalculateOvertime()`: when the scheduled
 * return (`end_date` + `return_time`) has already passed, the extension fee is
 * set to the flat car tier (1-6h, 7-10h, 11-12h, 13-24h) unless the user has
 * already typed a value.
 */

type FeeKey =
  | "daily_rent"
  | "extension_fee"
  | "agent_fee"
  | "delivery_fee"
  | "jer_delivery_fee"
  | "pickup_fee"
  | "jer_pickup_fee"
  | "carwash"
  | "fuel"
  | "damage_fee"
  | "driver_fee"
  | "others"
  | "discount_amount";

function amount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return value.toFixed(2);
}

/**
 * Legacy `autoCalculateOvertime()` — only fires when the scheduled return has
 * genuinely passed. Returns the flat extension tier for the number of hours
 * late, or null when the car is back on time.
 */
function overtimeFor(booking: PendingSettlement) {
  if (!booking.end_date || !booking.return_time) return null;

  const scheduled = new Date(`${booking.end_date}T${booking.return_time}`);
  const now = new Date();

  if (Number.isNaN(scheduled.getTime()) || now <= scheduled) return null;

  const hours = Math.ceil((now.getTime() - scheduled.getTime()) / 3_600_000);
  if (hours <= 0) return null;

  const fee =
    hours <= 6
      ? amount(booking.ext_price_1_6)
      : hours <= 10
        ? amount(booking.ext_price_7_10)
        : hours <= 12
          ? amount(booking.ext_price_11_12)
          : amount(booking.ext_price_13_24);

  return { hours, fee };
}

function FeeField({
  id,
  name,
  label,
  value,
  onChange,
  tone,
  hint,
}: {
  id: string;
  name: FeeKey;
  label: string;
  value: string;
  onChange: (name: FeeKey, value: string) => void;
  tone?: string;
  hint?: string;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className={cn("mb-1 block text-xs font-bold", tone ?? "text-foreground")}
      >
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="rounded-lg"
      />
      {hint ? <p className="mt-1 text-[0.68rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SettlementDialog({
  booking,
  settledBy,
  label = "Enter Fees",
  fullWidth = false,
}: {
  booking: PendingSettlement;
  /** Session user id — kept as a hidden input for legacy form parity. */
  settledBy: number;
  label?: string;
  fullWidth?: boolean;
}) {
  const extension = amount(booking.extension_price);
  const totalPrice = amount(booking.total_price);

  const [overtime] = useState(() => overtimeFor(booking));

  const [fees, setFees] = useState<Record<FeeKey, string>>({
    daily_rent: money(totalPrice - extension),
    extension_fee: money(overtime ? overtime.fee : extension),
    agent_fee: "0.00",
    delivery_fee: money(amount(booking.delivery_fee)),
    jer_delivery_fee: "0.00",
    pickup_fee: money(amount(booking.pickup_fee)),
    jer_pickup_fee: "0.00",
    carwash: "0.00",
    fuel: "0.00",
    damage_fee: "0.00",
    driver_fee: "0.00",
    others: "0.00",
    discount_amount: "0.00",
  });

  const handleChange = (name: FeeKey, value: string) => {
    setFees((current) => ({ ...current, [name]: value }));
  };

  const gross =
    amount(fees.daily_rent) +
    amount(fees.extension_fee) +
    amount(fees.delivery_fee) +
    amount(fees.pickup_fee) +
    amount(fees.damage_fee) +
    amount(fees.others) +
    amount(fees.carwash) +
    amount(fees.fuel) +
    amount(fees.driver_fee);

  const net =
    gross -
    amount(fees.jer_delivery_fee) -
    amount(fees.jer_pickup_fee) -
    amount(fees.agent_fee);

  const vehicle =
    [booking.brand, booking.model].filter(Boolean).join(" ") || "Vehicle";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.6rem] border border-[#ffd700] bg-[#ffd700] px-3.5 py-2 text-[0.78rem] font-bold text-black transition-all hover:-translate-y-px hover:border-[#e6c200] hover:bg-[#e6c200] hover:shadow-[0_4px_12px_rgba(255,215,0,0.4)]",
            fullWidth && "w-full",
          )}
        >
          <Receipt className="size-4" />
          {label}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-8 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Receipt className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
            Financial Settlement: {booking.brand ?? "Vehicle"}
          </DialogTitle>
          <DialogDescription>
            {vehicle}
            {booking.plate_number ? ` · ${booking.plate_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form action={savePaymentAction} className="space-y-4">
          <input type="hidden" name="booking_id" value={booking.id} />
          <input type="hidden" name="settled_by" value={settledBy} />
          <input type="hidden" name="total_gross" value={gross.toFixed(2)} />
          <input type="hidden" name="total_net" value={net.toFixed(2)} />

          {/* Base rental summary */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Info className="size-4" />
                Base Rental Amount:
              </span>
              <span className="font-bold tabular-nums">{peso(totalPrice)}</span>
            </div>

            {booking.end_date ? (
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  Scheduled Return:
                </span>
                <span className="font-semibold text-foreground">
                  {dateOnly(booking.end_date)}
                  {booking.return_time ? ` ${booking.return_time.slice(0, 5)}` : ""}
                </span>
              </div>
            ) : null}

            {amount(booking.extension_hours) > 0 ? (
              <>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">
                    Extension ({amount(booking.extension_hours)} hrs):
                  </span>
                  <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {peso(extension)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                  <span className="font-bold">Total Amount:</span>
                  <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {peso(totalPrice)}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {overtime ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-500/40 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                <CalendarClock className="size-4" />
                Overtime Detected
              </div>
              <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                {overtime.hours} Hour{overtime.hours > 1 ? "s" : ""} Late (+
                {peso(overtime.fee)})
              </p>
            </div>
          ) : null}

          {/* Revenue details */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
              Revenue Details
            </p>
            <hr className="my-1.5 border-border" />
            <div className="grid gap-3 sm:grid-cols-3">
              <FeeField
                id={`settle-rent-${booking.id}`}
                name="daily_rent"
                label="Daily Rent"
                value={fees.daily_rent}
                onChange={handleChange}
              />
              <FeeField
                id={`settle-extension-${booking.id}`}
                name="extension_fee"
                label="Extension Fees"
                value={fees.extension_fee}
                onChange={handleChange}
              />
              <FeeField
                id={`settle-agent-${booking.id}`}
                name="agent_fee"
                label="Agent Fees"
                value={fees.agent_fee}
                onChange={handleChange}
                tone="text-sky-600 dark:text-sky-400"
              />
            </div>
          </div>

          {/* Logistics */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
              Logistics & Fees
            </p>
            <hr className="my-1.5 border-border" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FeeField
                id={`settle-delivery-${booking.id}`}
                name="delivery_fee"
                label="Delivery Fees"
                value={fees.delivery_fee}
                onChange={handleChange}
                tone="text-sky-600 dark:text-sky-400"
              />
              <FeeField
                id={`settle-jer-delivery-${booking.id}`}
                name="jer_delivery_fee"
                label="Staff Delivery Fees"
                value={fees.jer_delivery_fee}
                onChange={handleChange}
                tone="text-sky-600 dark:text-sky-400"
              />
              <FeeField
                id={`settle-pickup-${booking.id}`}
                name="pickup_fee"
                label="Pickup Fees"
                value={fees.pickup_fee}
                onChange={handleChange}
                tone="text-rose-600 dark:text-rose-400"
              />
              <FeeField
                id={`settle-jer-pickup-${booking.id}`}
                name="jer_pickup_fee"
                label="Staff Pick up"
                value={fees.jer_pickup_fee}
                onChange={handleChange}
                tone="text-rose-600 dark:text-rose-400"
              />
            </div>
          </div>

          {/* Expenses & deductions */}
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
              Expenses & Deductions
            </p>
            <hr className="my-1.5 border-border" />
            <div className="grid gap-3 sm:grid-cols-3">
              <FeeField
                id={`settle-carwash-${booking.id}`}
                name="carwash"
                label="Carwash Fees"
                value={fees.carwash}
                onChange={handleChange}
              />
              <FeeField
                id={`settle-fuel-${booking.id}`}
                name="fuel"
                label="Fuel Fees"
                value={fees.fuel}
                onChange={handleChange}
                tone="text-amber-600 dark:text-amber-400"
              />
              <FeeField
                id={`settle-damage-${booking.id}`}
                name="damage_fee"
                label="Damage Fees"
                value={fees.damage_fee}
                onChange={handleChange}
                tone="text-rose-600 dark:text-rose-400"
              />
              <FeeField
                id={`settle-driver-${booking.id}`}
                name="driver_fee"
                label="Driver Fees"
                value={fees.driver_fee}
                onChange={handleChange}
              />
              <FeeField
                id={`settle-others-${booking.id}`}
                name="others"
                label="Other Fees"
                value={fees.others}
                onChange={handleChange}
              />
              <FeeField
                id={`settle-discount-${booking.id}`}
                name="discount_amount"
                label="Discount Amount"
                value={fees.discount_amount}
                onChange={handleChange}
                hint="Recorded for reference only."
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor={`settle-remarks-${booking.id}`}
              className="mb-1 block text-xs font-bold text-muted-foreground"
            >
              Notes / Remarks
            </Label>
            <Textarea
              id={`settle-remarks-${booking.id}`}
              name="remarks"
              rows={2}
              defaultValue={booking.remarks ?? ""}
              placeholder="Enter any additional notes or remarks for this settlement..."
              className="rounded-lg"
            />
          </div>

          {/* Live totals */}
          <div className="rounded-xl bg-slate-900 p-4 text-white">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/80">Gross Revenue:</span>
              <span className="font-bold tabular-nums">{peso(gross)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-white/80">Less: Staff Delivery Fee:</span>
              <span className="font-bold tabular-nums text-rose-400">
                {peso(amount(fees.jer_delivery_fee))}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-white/80">Less: Staff Pickup Fee:</span>
              <span className="font-bold tabular-nums text-rose-400">
                {peso(amount(fees.jer_pickup_fee))}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-white/80">Less: Agent Fee:</span>
              <span className="font-bold tabular-nums text-rose-400">
                {peso(amount(fees.agent_fee))}
              </span>
            </div>
            <hr className="my-2 border-white/20" />
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">NET TOTAL:</span>
              <span className="text-lg font-extrabold tabular-nums text-[#ffd700]">
                {peso(net)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              type="submit"
              loadingText="Saving..."
              className="rounded-lg bg-[#ffd700] px-4 font-bold text-black hover:bg-[#e6c200]"
            >
              Confirm &amp; Save
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
