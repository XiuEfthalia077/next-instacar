"use client";

import { useState } from "react";
import { ClipboardList, Trash2 } from "lucide-react";

import { DeleteBookingDialog } from "@/components/admin/delete-booking-dialog";
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
 * "Edit Reservation Details" modal — port of the online bookings credentials
 * modal (`#editCredentialsModal`) from `bookings_online.php`.
 */
export function EditReservationDialog({
  open,
  onOpenChange,
  booking,
  filter,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: EditableReservation;
  filter: string;
  documents: BookingDocument[];
}) {
  const [fulfillment, setFulfillment] = useState(
    booking.fulfillment_type?.toLowerCase() === "delivery" ? "delivery" : "pickup",
  );

  const isDelivery = fulfillment === "delivery";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
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
          <input type="hidden" name="source" value="online" />
          <input type="hidden" name="filter" value={filter} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`reservation-fulfillment-${booking.id}`} className="mb-1 block text-xs font-bold">
                Fulfillment Type
              </Label>
              <select
                id={`reservation-fulfillment-${booking.id}`}
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
              <Label htmlFor={`reservation-address-${booking.id}`} className="mb-1 block text-xs font-bold">
                Delivery Address
              </Label>
              <Input
                id={`reservation-address-${booking.id}`}
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
              <Label htmlFor={`reservation-start-${booking.id}`} className="mb-1 block text-xs font-bold">
                Start Date
              </Label>
              <Input
                id={`reservation-start-${booking.id}`}
                type="date"
                name="start_date"
                defaultValue={booking.start_date ?? ""}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor={`reservation-end-${booking.id}`} className="mb-1 block text-xs font-bold">
                End Date
              </Label>
              <Input
                id={`reservation-end-${booking.id}`}
                type="date"
                name="end_date"
                defaultValue={booking.end_date ?? ""}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor={`reservation-pickup-${booking.id}`} className="mb-1 block text-xs font-bold">
                Pickup Time
              </Label>
              <Input
                id={`reservation-pickup-${booking.id}`}
                type="time"
                name="pickup_time"
                defaultValue={timeValue(booking.pickup_time)}
                step={60}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor={`reservation-return-${booking.id}`} className="mb-1 block text-xs font-bold">
                Return Time
              </Label>
              <Input
                id={`reservation-return-${booking.id}`}
                type="time"
                name="return_time"
                defaultValue={timeValue(booking.return_time)}
                step={60}
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor={`reservation-total-${booking.id}`} className="mb-1 block text-xs font-bold">
                Total Price (₱)
              </Label>
              <Input
                id={`reservation-total-${booking.id}`}
                type="number"
                name="total_price"
                defaultValue={Number(booking.total_price ?? 0)}
                min={0}
                step="0.01"
                required
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor={`reservation-down-${booking.id}`} className="mb-1 block text-xs font-bold">
                Down Payment (₱)
              </Label>
              <Input
                id={`reservation-down-${booking.id}`}
                type="number"
                name="down_payment"
                defaultValue={Number(booking.down_payment ?? 0)}
                min={0}
                step="0.01"
                required
                className="rounded-lg"
              />
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
              <UploadField
                id={`reservation-primary-${booking.id}`}
                name="primary_id"
                label="Primary ID"
                document={documents.find((document) => document.key === "primary")}
              />
              <UploadField
                id={`reservation-secondary-${booking.id}`}
                name="secondary_id"
                label="Secondary ID"
                document={documents.find((document) => document.key === "secondary")}
              />
              <UploadField
                id={`reservation-billing-${booking.id}`}
                name="proof_of_billing"
                label="Proof of Billing"
                document={documents.find((document) => document.key === "billing")}
              />
              <UploadField
                id={`reservation-payment-${booking.id}`}
                name="proof_of_payment"
                label="Proof of Payment"
                document={documents.find((document) => document.key === "payment")}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
            <DeleteBookingDialog
              bookingId={booking.id}
              redirectTo={`/admin/bookings_online?filter=${encodeURIComponent(filter)}`}
              trigger={
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-auto gap-2 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                >
                  <Trash2 className="size-4" />
                  Delete Booking
                </Button>
              }
            />
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-lg px-4 font-semibold">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="rounded-lg px-4 font-bold bg-[#ffcc00] text-black hover:bg-[#e6b800]">
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadField({
  id,
  name,
  label,
  document,
}: {
  id: string;
  name: string;
  label: string;
  document?: BookingDocument;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-bold">
          {label}
        </Label>
        {document?.url ? <DocumentPreviewButton document={document} compact /> : null}
      </div>
      <Input
        id={id}
        type="file"
        name={name}
        accept="image/*,.pdf"
        className="cursor-pointer rounded-lg file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-semibold"
      />
    </div>
  );
}
