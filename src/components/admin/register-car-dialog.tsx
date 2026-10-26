"use client";

import { Building, CarFront, CheckCircle2, Image as ImageIcon, Plus, ShieldAlert, Sparkles, X } from "lucide-react";
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

type RegisterCarDialogProps = {
  branches: { id: number; name: string }[];
  operators?: OperatorOption[];
  trigger?: React.ReactNode;
};

export function RegisterCarDialog({
  branches,
  operators = [],
  trigger,
}: RegisterCarDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            className="gap-2 rounded-xl bg-[#ffcc00] font-bold text-black transition hover:bg-[#ffd633]"
          >
            <Plus className="size-4" />
            <span>Add New Car</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto border-border bg-[#0d0f12] text-foreground sm:rounded-2xl p-6 sm:p-8">
        <DialogHeader className="border-b border-border/80 pb-4 pr-8">
          <DialogTitle className="text-xl font-extrabold text-foreground">
            Register New Vehicle
          </DialogTitle>
          <DialogDescription className="sr-only">
            Register a new vehicle into the fleet database.
          </DialogDescription>
        </DialogHeader>

        <form action={saveCarAction} className="space-y-4 pt-1">
          {/* Vehicle Media Upload Stash with Main Photo selector */}
          <VehicleMediaStash maxSizeMB={5} />

          {/* Form Fields Grid (Matching Image 3) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="reg-brand" className="text-xs font-bold text-foreground">
                Brand *
              </Label>
              <Input
                id="reg-brand"
                name="brand"
                required
                placeholder="e.g. Toyota"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reg-model" className="text-xs font-bold text-foreground">
                Model *
              </Label>
              <Input
                id="reg-model"
                name="model"
                required
                placeholder="e.g. Fortuner"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reg-trans" className="text-xs font-bold text-foreground">
                Transmission
              </Label>
              <select
                id="reg-trans"
                name="transmission"
                defaultValue="Manual"
                className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground focus:border-[#ffcc00] focus:outline-none"
              >
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
              </select>
            </div>

            <div>
              <Label htmlFor="reg-seats" className="text-xs font-bold text-foreground">
                Seats
              </Label>
              <Input
                id="reg-seats"
                name="capacity"
                type="number"
                defaultValue={5}
                min={1}
                max={30}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reg-color" className="text-xs font-bold text-foreground">
                Color
              </Label>
              <Input
                id="reg-color"
                name="color"
                placeholder="e.g. RED"
                className="mt-1 uppercase"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">
                Car Type
              </Label>
              <div className="mt-1">
                <CarTypePicker name="type" value="SUV" />
              </div>
            </div>

            <div>
              <Label htmlFor="reg-fuel" className="text-xs font-bold text-foreground">
                Fuel Type
              </Label>
              <select
                id="reg-fuel"
                name="fuel_type"
                defaultValue="Regular"
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
              <Label htmlFor="reg-plate" className="text-xs font-bold text-foreground">
                Plate Number *
              </Label>
              <Input
                id="reg-plate"
                name="plate_number"
                required
                placeholder="ABC-1234"
                className="mt-1 font-mono uppercase"
              />
            </div>
          </div>

          {/* Branch Assignment */}
          <div className="space-y-1">
            <Label htmlFor="reg-branch" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>🏠 Branch</span>
            </Label>
            <select
              id="reg-branch"
              name="branch_id"
              defaultValue=""
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
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>🪪 Assign to Operator</span>
            </Label>
            <OperatorSelect operators={operators} name="user_id" />
          </div>

          {/* Monthly Amortization (Specifically for Company-owned cars) */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reg-amortization" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <span>💳 Monthly Amortization</span>
              </Label>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Company Cars
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₱</span>
              <Input
                id="reg-amortization"
                name="monthly_amortization"
                type="number"
                step="0.01"
                min="0"
                defaultValue={0}
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
                <Label htmlFor="reg-p10" className="text-xs font-bold text-foreground">
                  Price per 10 Hrs (₱)
                </Label>
                <Input
                  id="reg-p10"
                  name="price_10_hours"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reg-op10" className="text-xs font-bold text-emerald-500">
                  Operator Share 10 Hrs (₱)
                </Label>
                <Input
                  id="reg-op10"
                  name="operator_10_hours"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1 text-emerald-400"
                />
              </div>

              <div>
                <Label htmlFor="reg-p12" className="text-xs font-bold text-foreground">
                  Price per 12 Hrs (₱)
                </Label>
                <Input
                  id="reg-p12"
                  name="price_12_hours"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reg-op12" className="text-xs font-bold text-emerald-500">
                  Operator Share 12 Hrs (₱)
                </Label>
                <Input
                  id="reg-op12"
                  name="operator_12_hours"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1 text-emerald-400"
                />
              </div>

              <div>
                <Label htmlFor="reg-p24" className="text-xs font-bold text-foreground">
                  Price per 24 Hrs (₱) *
                </Label>
                <Input
                  id="reg-p24"
                  name="price_24_hours"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0"
                  className="mt-1 font-bold text-[#ffcc00]"
                />
              </div>
              <div>
                <Label htmlFor="reg-op24" className="text-xs font-bold text-emerald-500">
                  Operator Share 24 Hrs (₱)
                </Label>
                <Input
                  id="reg-op24"
                  name="operator_24_hours"
                  type="number"
                  step="0.01"
                  placeholder="0"
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
                <Label htmlFor="reg-ext1" className="text-[11px] font-bold text-foreground">
                  1-6 Hours (₱/Hr)
                </Label>
                <Input
                  id="reg-ext1"
                  name="ext_price_1_6"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="reg-ext7" className="text-[11px] font-bold text-foreground">
                  7-10 Hours (₱)
                </Label>
                <Input
                  id="reg-ext7"
                  name="ext_price_7_10"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="reg-ext11" className="text-[11px] font-bold text-foreground">
                  11-12 Hours (₱)
                </Label>
                <Input
                  id="reg-ext11"
                  name="ext_price_11_12"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="reg-ext13" className="text-[11px] font-bold text-foreground">
                  13-24 Hours (₱)
                </Label>
                <Input
                  id="reg-ext13"
                  name="ext_price_13_24"
                  type="number"
                  step="0.01"
                  placeholder="0"
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
              Register Car
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
