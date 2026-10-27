"use client";

import { Edit3 } from "lucide-react";
import * as React from "react";

import { CarTypePicker } from "@/components/admin/car-type-picker";
import { OperatorSelect, type OperatorOption } from "@/components/admin/operator-select";
import { VehicleMediaStash } from "@/components/admin/vehicle-media-stash";
import { LoadingButton } from "@/components/common/loading-button";
import { Button } from "@/components/ui/button";
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
import { saveCarAction } from "@/lib/actions/cars";
import type { CarWithOwner } from "@/lib/data/cars";
import { carImageUrl } from "@/lib/storage";

type EditCarDialogProps = {
  car: CarWithOwner;
  branches: { id: number; name: string }[];
  operators?: OperatorOption[];
  isAdmin: boolean;
  trigger?: React.ReactNode;
};

export function EditCarDialog({
  car,
  branches,
  operators = [],
  isAdmin,
  trigger,
}: EditCarDialogProps) {
  const [open, setOpen] = React.useState(false);

  const existingImages = React.useMemo(() => {
    return car.image_path
      ? car.image_path
          .split(",")
          .map((img) => img.trim())
          .filter((img) => Boolean(img) && img !== "default.png")
      : [];
  }, [car.image_path]);

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
            title="Edit Car Information"
          >
            <Edit3 className="size-4" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-border bg-card text-card-foreground sm:rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-border/80 pb-4 pr-8">
          <DialogTitle className="text-xl font-extrabold text-foreground">
            Edit Vehicle — {carName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update vehicle details, branch assignment, rates, and fleet credentials.
          </DialogDescription>
        </DialogHeader>

        <form action={saveCarAction} className="space-y-4 pt-1">
          <input type="hidden" name="id" value={car.id} />

          {/* Vehicle Media Upload Stash with Main Photo Selector */}
          <VehicleMediaStash existingImages={existingImages} maxSizeMB={5} />

          {/* Form Fields Grid (Matching Image 3) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`brand-${car.id}`} className="text-xs font-bold text-foreground">
                Brand *
              </Label>
              <Input
                id={`brand-${car.id}`}
                name="brand"
                defaultValue={car.brand ?? ""}
                required
                placeholder="e.g. Toyota"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`model-${car.id}`} className="text-xs font-bold text-foreground">
                Model *
              </Label>
              <Input
                id={`model-${car.id}`}
                name="model"
                defaultValue={car.model ?? ""}
                required
                placeholder="e.g. Fortuner"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`trans-${car.id}`} className="text-xs font-bold text-foreground">
                Transmission
              </Label>
              <select
                id={`trans-${car.id}`}
                name="transmission"
                defaultValue={car.transmission ?? "Manual"}
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:border-[#ffcc00] focus:outline-none"
              >
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
              </select>
            </div>

            <div>
              <Label htmlFor={`seats-${car.id}`} className="text-xs font-bold text-foreground">
                Seats
              </Label>
              <Input
                id={`seats-${car.id}`}
                name="capacity"
                type="number"
                defaultValue={car.capacity ?? 5}
                min={1}
                max={30}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`color-${car.id}`} className="text-xs font-bold text-foreground">
                Color
              </Label>
              <Input
                id={`color-${car.id}`}
                name="color"
                defaultValue={car.color ?? ""}
                placeholder="e.g. RED"
                className="mt-1 uppercase"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">
                Car Type
              </Label>
              <div className="mt-1">
                <CarTypePicker name="type" value={car.type ?? "SUV"} />
              </div>
            </div>

            <div>
              <Label htmlFor={`fuel-${car.id}`} className="text-xs font-bold text-foreground">
                Fuel Type
              </Label>
              <select
                id={`fuel-${car.id}`}
                name="fuel_type"
                defaultValue={car.fuel_type ?? "Regular"}
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:border-[#ffcc00] focus:outline-none"
              >
                <option value="Regular">Regular</option>
                <option value="Premium">Premium</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <Label htmlFor={`plate-${car.id}`} className="text-xs font-bold text-foreground">
                Plate Number *
              </Label>
              <Input
                id={`plate-${car.id}`}
                name="plate_number"
                defaultValue={car.plate_number ?? ""}
                required
                placeholder="ABC-1234"
                className="mt-1 font-mono uppercase"
              />
            </div>
          </div>

          {/* Branch Assignment */}
          <div className="space-y-1">
            <Label htmlFor={`branch-${car.id}`} className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>🏠 Branch</span>
            </Label>
            <select
              id={`branch-${car.id}`}
              name="branch_id"
              defaultValue={car.branch_id ? String(car.branch_id) : ""}
              className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:border-[#ffcc00] focus:outline-none"
            >
              <option value="">— No Branch —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Which location does this vehicle belong to?
            </p>
          </div>

          {/* Assign to Operator (Matching Image 5) */}
          {isAdmin ? (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>🪪 Assign to Operator</span>
              </Label>
              <OperatorSelect
                operators={operators}
                value={car.user_id}
                name="user_id"
              />
            </div>
          ) : null}

          {/* Monthly Amortization (Specifically for Company-owned cars) */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`amortization-${car.id}`} className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>💳 Monthly Amortization</span>
              </Label>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Company Cars
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₱</span>
              <Input
                id={`amortization-${car.id}`}
                name="monthly_amortization"
                type="number"
                step="0.01"
                min="0"
                defaultValue={car.monthly_amortization ?? 0}
                placeholder="20,000"
                className="pl-7 text-xs font-bold"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Required for Company-owned vehicles to calculate true company net profit in analytics.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/80 pt-2" />

          {/* Base Tier Tariffs & Shares (Matching Image 3) */}
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-foreground">
              Base Tier Tariffs &amp; Shares
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`p10-${car.id}`} className="text-xs font-bold text-foreground">
                  Price per 10 Hrs (₱)
                </Label>
                <Input
                  id={`p10-${car.id}`}
                  name="price_10_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.price_10_hours ?? 0}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`op10-${car.id}`} className="text-xs font-bold text-emerald-500">
                  Operator Share 10 Hrs (₱)
                </Label>
                <Input
                  id={`op10-${car.id}`}
                  name="operator_10_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.operator_10_hours ?? 0}
                  className="mt-1 text-emerald-400"
                />
              </div>

              <div>
                <Label htmlFor={`p12-${car.id}`} className="text-xs font-bold text-foreground">
                  Price per 12 Hrs (₱)
                </Label>
                <Input
                  id={`p12-${car.id}`}
                  name="price_12_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.price_12_hours ?? 0}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`op12-${car.id}`} className="text-xs font-bold text-emerald-500">
                  Operator Share 12 Hrs (₱)
                </Label>
                <Input
                  id={`op12-${car.id}`}
                  name="operator_12_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.operator_12_hours ?? 0}
                  className="mt-1 text-emerald-400"
                />
              </div>

              <div>
                <Label htmlFor={`p24-${car.id}`} className="text-xs font-bold text-foreground">
                  Price per 24 Hrs (₱) *
                </Label>
                <Input
                  id={`p24-${car.id}`}
                  name="price_24_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.price_24_hours ?? 0}
                  required
                  className="mt-1 font-bold text-[#ffcc00]"
                />
              </div>
              <div>
                <Label htmlFor={`op24-${car.id}`} className="text-xs font-bold text-emerald-500">
                  Operator Share 24 Hrs (₱)
                </Label>
                <Input
                  id={`op24-${car.id}`}
                  name="operator_24_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.operator_24_hours ?? 0}
                  className="mt-1 text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/80 pt-2" />

          {/* Hourly Overtime Extensions (Matching Image 3) */}
          <div>
            <h4 className="mb-2 text-xs font-extrabold text-rose-500">
              Hourly Overtime Extensions
            </h4>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div>
                <Label htmlFor={`ext1-${car.id}`} className="text-[11px] font-bold text-foreground">
                  1-6 Hours (₱/Hr)
                </Label>
                <Input
                  id={`ext1-${car.id}`}
                  name="ext_price_1_6"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_1_6 ?? 0}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`ext7-${car.id}`} className="text-[11px] font-bold text-foreground">
                  7-10 Hours (₱)
                </Label>
                <Input
                  id={`ext7-${car.id}`}
                  name="ext_price_7_10"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_7_10 ?? 0}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`ext11-${car.id}`} className="text-[11px] font-bold text-foreground">
                  11-12 Hours (₱)
                </Label>
                <Input
                  id={`ext11-${car.id}`}
                  name="ext_price_11_12"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_11_12 ?? 0}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`ext13-${car.id}`} className="text-[11px] font-bold text-foreground">
                  13-24 Hours (₱)
                </Label>
                <Input
                  id={`ext13-${car.id}`}
                  name="ext_price_13_24"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_13_24 ?? 0}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer (Matching Image 3) */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl border-border px-5 text-xs font-semibold"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              className="rounded-xl bg-[#ffcc00] px-6 font-bold text-black hover:bg-[#ffd633]"
            >
              Save Vehicle Changes
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
