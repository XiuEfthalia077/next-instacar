"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";

import { DocumentPreviewButton, type BookingDocument } from "@/components/admin/document-preview";
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
import { updateReservationAction } from "@/lib/actions/bookings";

export type EditableReservation = {
  id: number;
  fulfillment_type: string | null;
  delivery_address: string | null;
  start_date: string | null;
  end_date: string | null;
  pickup_time: string | null;
  return_time: string | null;
  total_price: number | null;
  down_payment: number | null;
};

function timeValue(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

/**
 * "Edit Reservation Details" modal — port of the credentials modal from the
 * legacy booking details page.
 */
export function EditReservationDialog({
  booking,
  filter,
  documents,
  trigger,
}: {
  booking: EditableReservation & { booking_type?: string | null };
  filter: string;
  documents: BookingDocument[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState(
    booking.fulfillment_type?.toLowerCase() === "delivery" ? "delivery" : "pickup",
  );

  const isDelivery = fulfillment === "delivery";
  const source = booking.booking_type === "manual" ? "manual" : "online";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-8 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/70 pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="size-5 text-[#b38a00] dark:text-[#ffd700]" />
            Edit Reservation Details
          </DialogTitle>
          <DialogDescription>
            Booking <span className="font-semibold text-foreground">#BK-{booking.id}</span>{" "}
            · update the schedule, pricing and verification documents.
          </DialogDescription>
        </DialogHeader>

        <form action={updateReservationAction} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="booking_id" value={booking.id} />
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="filter" value={filter} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs font-bold">Fulfillment Type</Label>
              <select
                name="fulfillment_type"
                value={fulfillment}
                onChange={(event) => setFulfillment(event.target.value)}
                className={filterControlClass}
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">Delivery Address</Label>
              <Input
                type="text"
                name="delivery_address"
                defaultValue={booking.delivery_address ?? ""}
                disabled={!isDelivery}
                required={isDelivery}
                placeholder={isDelivery ? "Complete delivery address" : "Address if Delivery"}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">Start Date</Label>
              <Input type="date" name="start_date" defaultValue={booking.start_date ?? ""} required className="rounded-lg" />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">End Date</Label>
              <Input type="date" name="end_date" defaultValue={booking.end_date ?? ""} required className="rounded-lg" />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">Pickup Time</Label>
              <Input type="time" name="pickup_time" defaultValue={timeValue(booking.pickup_time)} step={60} required className="rounded-lg" />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">Return Time</Label>
              <Input type="time" name="return_time" defaultValue={timeValue(booking.return_time)} step={60} required className="rounded-lg" />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">Total Price (₱)</Label>
              <Input type="number" name="total_price" defaultValue={Number(booking.total_price ?? 0)} min={0} step="0.01" required className="rounded-lg" />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-bold">Down Payment (₱)</Label>
              <Input type="number" name="down_payment" defaultValue={Number(booking.down_payment ?? 0)} min={0} step="0.01" required className="rounded-lg" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-1 text-sm font-extrabold text-foreground">
              Update Documents / Verification
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">(Optional)</span>
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Leave a field blank to keep the currently uploaded file.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <UploadField name="primary_id" label="Primary ID" document={documents.find((d) => d.key === "primary")} />
              <UploadField name="secondary_id" label="Secondary ID" document={documents.find((d) => d.key === "secondary")} />
              <UploadField name="proof_of_billing" label="Proof of Billing" document={documents.find((d) => d.key === "billing")} />
              <UploadField name="proof_of_payment" label="Proof of Payment" document={documents.find((d) => d.key === "payment")} />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-lg px-4 font-bold">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadField({
  name,
  label,
  document,
}: {
  name: string;
  label: string;
  document?: BookingDocument;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label className="text-xs font-bold">{label}</Label>
        {document?.url ? <DocumentPreviewButton document={document} compact /> : null}
      </div>
      <Input
        type="file"
        name={name}
        accept="image/*,.pdf"
        className="cursor-pointer rounded-lg file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-semibold"
      />
    </div>
  );
}
