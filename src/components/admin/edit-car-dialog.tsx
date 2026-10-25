"use client";

import { Edit3, ImagePlus, Trash2, X } from "lucide-react";
import * as React from "react";

import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
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
  operators?: { id: number; name: string | null }[];
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

  const [markedToDelete, setMarkedToDelete] = React.useState<string[]>([]);

  const toggleDeleteImage = (img: string) => {
    setMarkedToDelete((prev) =>
      prev.includes(img) ? prev.filter((i) => i !== img) : [...prev, img],
    );
  };

  const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
          >
            <Edit3 className="size-3.5" />
            <span>Edit</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-[#0d0f12] text-foreground sm:rounded-2xl">
        <DialogHeader className="border-b border-border/80 pb-4">
          <DialogTitle className="text-lg font-bold text-foreground">
            Edit Vehicle — {carName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update vehicle details, branch assignment, rates, and fleet credentials.
          </DialogDescription>
        </DialogHeader>

        <form action={saveCarAction} className="space-y-5 pt-2">
          <input type="hidden" name="id" value={car.id} />

          {/* Core Specs */}
          <div>
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Vehicle Identity & Classification
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`brand-${car.id}`} className="text-xs font-bold">
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
                <Label htmlFor={`model-${car.id}`} className="text-xs font-bold">
                  Model *
                </Label>
                <Input
                  id={`model-${car.id}`}
                  name="model"
                  defaultValue={car.model ?? ""}
                  required
                  placeholder="e.g. Vios"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`plate-${car.id}`} className="text-xs font-bold">
                  Plate Number *
                </Label>
                <Input
                  id={`plate-${car.id}`}
                  name="plate_number"
                  defaultValue={car.plate_number ?? ""}
                  required
                  placeholder="e.g. ABC 1234"
                  className="mt-1 font-mono uppercase"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor={`type-${car.id}`} className="text-xs font-bold">
                  Type
                </Label>
                <select
                  id={`type-${car.id}`}
                  name="type"
                  defaultValue={car.type ?? "Sedan"}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="MPV">MPV</option>
                  <option value="Van">Van</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Crossover">Crossover</option>
                </select>
              </div>

              <div>
                <Label htmlFor={`trans-${car.id}`} className="text-xs font-bold">
                  Transmission
                </Label>
                <select
                  id={`trans-${car.id}`}
                  name="transmission"
                  defaultValue={car.transmission ?? "Automatic"}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>

              <div>
                <Label htmlFor={`fuel-${car.id}`} className="text-xs font-bold">
                  Fuel Type
                </Label>
                <select
                  id={`fuel-${car.id}`}
                  name="fuel_type"
                  defaultValue={car.fuel_type ?? "Gasoline"}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Gasoline">Gasoline</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>

              <div>
                <Label htmlFor={`cap-${car.id}`} className="text-xs font-bold">
                  Seats Capacity
                </Label>
                <Input
                  id={`cap-${car.id}`}
                  name="capacity"
                  type="number"
                  defaultValue={car.capacity ?? 5}
                  min={1}
                  max={30}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`color-${car.id}`} className="text-xs font-bold">
                  Color
                </Label>
                <Input
                  id={`color-${car.id}`}
                  name="color"
                  defaultValue={car.color ?? ""}
                  placeholder="e.g. Silver"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`status-${car.id}`} className="text-xs font-bold">
                  Fleet Status
                </Label>
                <select
                  id={`status-${car.id}`}
                  name="status"
                  defaultValue={car.status}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Available">Available</option>
                  <option value="Active">Active (Rented)</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Not Available">Not Available</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>

              <div>
                <Label htmlFor={`branch-${car.id}`} className="text-xs font-bold">
                  Branch
                </Label>
                <select
                  id={`branch-${car.id}`}
                  name="branch_id"
                  defaultValue={car.branch_id ? String(car.branch_id) : "0"}
                  className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="0">Unassigned</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && operators.length > 0 ? (
                <div className="col-span-2 sm:col-span-3">
                  <Label htmlFor={`owner-${car.id}`} className="text-xs font-bold">
                    Car Owner / Operator
                  </Label>
                  <select
                    id={`owner-${car.id}`}
                    name="user_id"
                    defaultValue={car.user_id ? String(car.user_id) : ""}
                    className="mt-1 flex h-10 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Company Fleet</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name ?? `Operator #${op.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </div>

          {/* Rental Rates */}
          <div className="border-t border-border/80 pt-4">
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Rental Pricing (₱)
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`p10-${car.id}`} className="text-xs font-bold">
                  10-Hour Customer Rate
                </Label>
                <Input
                  id={`p10-${car.id}`}
                  name="price_10_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.price_10_hours ?? 0}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label htmlFor={`p12-${car.id}`} className="text-xs font-bold">
                  12-Hour Customer Rate
                </Label>
                <Input
                  id={`p12-${car.id}`}
                  name="price_12_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.price_12_hours ?? 0}
                  className="mt-1 font-mono"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor={`p24-${car.id}`} className="text-xs font-bold">
                  24-Hour Customer Rate *
                </Label>
                <Input
                  id={`p24-${car.id}`}
                  name="price_24_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.price_24_hours ?? 0}
                  required
                  className="mt-1 font-mono font-bold text-[#ffcc00]"
                />
              </div>

              {/* Operator Share Rates */}
              <div>
                <Label htmlFor={`op10-${car.id}`} className="text-xs font-bold">
                  Operator Share (10h)
                </Label>
                <Input
                  id={`op10-${car.id}`}
                  name="operator_10_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.operator_10_hours ?? 0}
                  className="mt-1 font-mono text-muted-foreground"
                />
              </div>

              <div>
                <Label htmlFor={`op12-${car.id}`} className="text-xs font-bold">
                  Operator Share (12h)
                </Label>
                <Input
                  id={`op12-${car.id}`}
                  name="operator_12_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.operator_12_hours ?? 0}
                  className="mt-1 font-mono text-muted-foreground"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor={`op24-${car.id}`} className="text-xs font-bold">
                  Operator Share (24h)
                </Label>
                <Input
                  id={`op24-${car.id}`}
                  name="operator_24_hours"
                  type="number"
                  step="0.01"
                  defaultValue={car.operator_24_hours ?? 0}
                  className="mt-1 font-mono text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Extension Overtime Rates */}
          <div className="border-t border-border/80 pt-4">
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Overtime / Extension Rates (₱/hr)
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor={`ext1-${car.id}`} className="text-[11px] font-bold">
                  1 - 6 Hours
                </Label>
                <Input
                  id={`ext1-${car.id}`}
                  name="ext_price_1_6"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_1_6 ?? 0}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`ext7-${car.id}`} className="text-[11px] font-bold">
                  7 - 10 Hours
                </Label>
                <Input
                  id={`ext7-${car.id}`}
                  name="ext_price_7_10"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_7_10 ?? 0}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`ext11-${car.id}`} className="text-[11px] font-bold">
                  11 - 12 Hours
                </Label>
                <Input
                  id={`ext11-${car.id}`}
                  name="ext_price_11_12"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_11_12 ?? 0}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`ext13-${car.id}`} className="text-[11px] font-bold">
                  13 - 24 Hours
                </Label>
                <Input
                  id={`ext13-${car.id}`}
                  name="ext_price_13_24"
                  type="number"
                  step="0.01"
                  defaultValue={car.ext_price_13_24 ?? 0}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Photos */}
          <div className="border-t border-border/80 pt-4">
            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Manage Vehicle Photos
            </h4>

            {existingImages.length > 0 ? (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Select any existing photo to delete upon save:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {existingImages.map((img) => {
                    const isMarked = markedToDelete.includes(img);
                    const url = carImageUrl(img);

                    return (
                      <div
                        key={img}
                        onClick={() => toggleDeleteImage(img)}
                        className={`group relative size-20 cursor-pointer overflow-hidden rounded-xl border-2 transition ${
                          isMarked
                            ? "border-rose-500 opacity-40 ring-2 ring-rose-500/40"
                            : "border-border hover:border-[#ffcc00]"
                        }`}
                        title={
                          isMarked ? "Click to keep" : "Click to mark for deletion"
                        }
                      >
                        {isMarked ? (
                          <input
                            type="hidden"
                            name="delete_existing_images"
                            value={img}
                          />
                        ) : null}

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Car photo"
                          className="size-full object-cover"
                        />

                        {isMarked ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-rose-950/70 text-rose-300">
                            <Trash2 className="size-5" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <Trash2 className="size-4 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-xs font-bold text-foreground">
                Add More Vehicle Photos
              </p>
              <FileUploadDropzone
                name="car_images"
                multiple
                accept="image/*"
                helperText="Upload JPG, PNG or WEBP photos (max 5MB each)."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/80 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              className="bg-[#ffcc00] font-bold text-black hover:bg-[#ffd633]"
            >
              Save Vehicle Changes
            </LoadingButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
