import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  ClipboardList,
  FileText,
  MapPin,
  StickyNote,
  Trash2,
  Truck,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteBookingDialog } from "@/components/admin/delete-booking-dialog";

import {
  BookingDocumentButton,
  BookingPhotoThumbnail,
} from "@/components/shared/booking-document-viewer";
import type { BookingDocument } from "@/components/admin/document-preview";
import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { Flash } from "@/components/common/flash";
import { LoadingButton } from "@/components/common/loading-button";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { BookingActions } from "@/components/shared/booking-actions";
import { ConfirmSubmit } from "@/components/shared/confirm-submit";
import { PayBalanceDialog } from "@/components/shared/pay-balance-dialog";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCustomerInfoAction, deleteBookingItemAction } from "@/lib/actions/bookings";
import { getBooking } from "@/lib/data/bookings";
import { getCar } from "@/lib/data/cars";
import { getSupabase, requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { BUCKETS, carImageUrls, signedFileUrls } from "@/lib/storage";

function isPdf(path: string | null | undefined) {
  return (path ?? "").toLowerCase().endsWith(".pdf");
}

function clock(value: string | null | undefined) {
  if (!value) return { value: "00:00", suffix: "AM" };
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return { value: `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`, suffix };
}

/**
 * Shared booking details — port of `car-rental/pages/shared/booking_details.php`.
 *
 * Access rules match the legacy prepared statement:
 *   admin    -> every booking
 *   operator -> only bookings of their own cars
 *   staff    -> only bookings of their own branch
 *   user     -> only their own bookings (read only)
 */
export const instant = false;

export default async function SharedBookingDetailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (session.role === "user") {
    redirect("/user/mybookings");
  }
  const params = await searchParams;
  const flash = readFlash(params);
  const bookingId = Number.parseInt(searchParam(params, "id") ?? "0", 10);

  if (!bookingId) notFound();

  const { booking, remarks, photos } = await getBooking(session, bookingId);

  const car = booking?.car_id ? await getCar(booking.car_id) : null;

  const denied =
    !booking ||
    (session.role === "operator" && car?.user_id !== session.userId) ||
    (session.role === "staff" && (!session.branchId || booking.branch_id !== session.branchId));

  if (denied) {
    return (
      <>
        <PageHeader title="Booking Details" description="Booking not found or access denied." />
        <Flash {...flash} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Booking not found or access denied.
          </CardContent>
        </Card>
      </>
    );
  }

  const supabase = await getSupabase();

  const uploadEntries = [
    { key: "primary", label: "ID 1", path: booking.primary_id_path },
    { key: "secondary", label: "ID 2", path: booking.secondary_id_path },
    { key: "billing", label: "BILLING", path: booking.proof_billing_path },
    { key: "payment", label: "PAYMENT", path: booking.proof_payment_path },
  ].filter((entry) => Boolean(entry.path));

  const [uploadUrls, photoUrls] = await Promise.all([
    uploadEntries.length
      ? signedFileUrls(
          supabase,
          BUCKETS.bookingUploads,
          uploadEntries.map((entry) => entry.path ?? ""),
        )
      : Promise.resolve<string[]>([]),
    photos.length
      ? signedFileUrls(
          supabase,
          BUCKETS.bookingPhotos,
          photos.map((photo) => photo.file_name),
        )
      : Promise.resolve<string[]>([]),
  ]);

  const documents: BookingDocument[] = uploadEntries.map((entry, index) => ({
    key: entry.key,
    label: entry.label,
    url: uploadUrls[index] ?? "",
    isPdf: isPdf(entry.path),
  }));

  const displayName = booking.users?.name ?? booking.guest_name ?? "N/A";
  const displayPhone = booking.users?.phone ?? booking.phone_number ?? "N/A";
  const displayEmail = booking.users?.email ?? booking.gmail ?? "N/A";

  const pickupClock = clock(booking.pickup_time);
  const returnClock = clock(booking.return_time);

  const pickupStamp = booking.start_date
    ? Date.parse(`${booking.start_date}T${booking.pickup_time ?? "00:00:00"}`)
    : 0;
  const returnStamp = booking.end_date
    ? Date.parse(`${booking.end_date}T${booking.return_time ?? "23:59:59"}`)
    : 0;
  const durationHours =
    pickupStamp && returnStamp && returnStamp > pickupStamp
      ? (returnStamp - pickupStamp) / 3_600_000
      : 0;
  const daysCount = Math.floor(durationHours / 24);
  const extraHours = durationHours - daysCount * 24;

  const basePrice = Number((booking as { base_price?: number | null }).base_price ?? booking.total_price ?? 0);
  const deliveryFee = Number(booking.delivery_fee ?? 0);
  const pickupFee = Number(booking.pickup_fee ?? 0);
  const discountAmount = Number(booking.discount_price ?? 0);
  const downPayment = Number(booking.down_payment ?? 0);
  const extensionFee = Number(booking.extension_price ?? 0);
  const extensionHours = Number(booking.extension_hours ?? 0);
  const totalRental = basePrice + deliveryFee + pickupFee + extensionFee - discountAmount;
  const remainingBal = Number(booking.total_price ?? 0);

  const statusLabel = booking.status === "Confirmed" ? "Released" : booking.status;
  const isUser = false;
  const canWrite = session.role === "admin" || session.role === "staff" || session.role === "operator";
  const canStatus = session.role === "admin" || session.role === "staff";

  const isDelivery = (booking.fulfillment_type ?? "Pickup").toLowerCase() === "delivery";
  const isOperatorCar = Boolean(car?.user_id && car?.users && car.users.role === "operator");
  const operatorDisplayName = isOperatorCar ? (car?.users?.name || `Operator #${car?.users?.id}`) : "Company Owned";

  const carImages = carImageUrls(car?.image_path);
  const firstCarImage = carImages[0]?.url ?? "";

  const backHref =
    session.role === "admin"
      ? "/admin/bookings_online"
      : session.role === "staff"
        ? "/staff/bookings"
        : session.role === "operator"
          ? "/operator/bookings"
          : "/user/mybookings";

  return (
    <>
      <PageHeader
        title={`Booking Details #${booking.id}`}
        description="Schedules, customer information, verification documents, remarks and payment breakdown."
        actions={
          <>
            <Link href="/shared/calendar">
              <Button variant="outline" className="gap-2 font-semibold">
                <CalendarClock className="size-4" />
                Back to Calendar
              </Button>
            </Link>
            <Link href={backHref}>
              <Button variant="ghost" className="gap-2 font-semibold">
                <ArrowLeft className="size-4" />
                Bookings
              </Button>
            </Link>
            {session.role === "admin" ? (
              <DeleteBookingDialog
                bookingId={booking.id}
                redirectTo={backHref}
                trigger={
                  <Button
                    variant="destructive"
                    className="gap-2 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  >
                    <Trash2 className="size-4" />
                    Delete Booking
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />

      <Flash {...flash} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {booking.booking_type === "manual" ? "Walk-in / Manual" : "Online Booking"}
        </span>
        <StatusBadge status={statusLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionCard icon={CarFront} title="Vehicle & Schedule">
            <div className="flex flex-wrap items-center gap-4 p-4 md:p-5">
              <div className="relative h-[90px] w-[140px] shrink-0 overflow-hidden rounded-xl bg-muted">
                {firstCarImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={firstCarImage} alt="Car" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <CarFront className="size-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">
                  {car?.brand} {car?.model}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#ffcc00]/20 px-2 py-0.5 text-xs font-bold text-[#b38a00] dark:text-[#ffd700]">
                    {car?.plate_number ?? "No plate"}
                  </span>
                  <span className="text-xs text-muted-foreground">Booking ID: #{booking.id}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-border bg-muted/30 p-4 sm:grid-cols-2 md:grid-cols-4 md:p-5">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pick-up</p>
                <p className="font-bold">{formatDate(booking.start_date, "long")}</p>
                <p className="text-sm font-bold text-[#b38a00] dark:text-[#ffd700]">
                  {pickupClock.value} <span className="font-normal text-muted-foreground">({pickupClock.value} {pickupClock.suffix})</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Return</p>
                <p className="font-bold">{formatDate(booking.end_date, "long")}</p>
                <p className="text-sm font-bold text-[#b38a00] dark:text-[#ffd700]">
                  {returnClock.value} <span className="font-normal text-muted-foreground">({returnClock.value} {returnClock.suffix})</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Duration</p>
                <p className="font-bold">
                  {daysCount > 0 ? `${daysCount}d ` : ""}
                  {extraHours.toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Daily Rate</p>
                <p className="font-bold text-[#b38a00] dark:text-[#ffd700]">
                  <Money value={car?.price_24_hours ?? 0} />
                </p>
              </div>
            </div>

            {extensionHours > 0 ? (
              <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40 md:m-5">
                <p className="font-bold text-amber-800 dark:text-amber-200">Extension Applied</p>
                <p className="text-amber-700 dark:text-amber-300">
                  {extensionHours} extra hour{extensionHours > 1 ? "s" : ""} — <Money value={extensionFee} />
                </p>
              </div>
            ) : null}

            {/* Fulfillment & Location Details */}
            <div className="border-t border-border bg-card p-4 md:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-[#ffcc00]/10 text-[#ffcc00] flex items-center justify-center shrink-0 mt-0.5">
                    {isDelivery ? <Truck className="size-5" /> : <MapPin className="size-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Fulfillment Type
                      </span>
                      <span className="rounded-full bg-[#ffcc00]/20 px-2.5 py-0.5 text-[11px] font-extrabold text-[#b38a00] dark:text-[#ffd700] border border-[#ffcc00]/40">
                        {isDelivery ? "🚚 Car Delivery" : "🏢 Office Self-Pickup"}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-xs text-muted-foreground font-semibold">
                        {isDelivery ? "Delivery & Drop-off Address:" : "Pickup / Office Location:"}
                      </p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {booking.delivery_address ||
                          (booking.branches?.name
                            ? `${booking.branches.name} - Instacar Car Rental Services`
                            : "Instacar Pavia, Iloilo Main Branch")}
                      </p>
                      {booking.return_delivery_address ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-semibold text-foreground">Return Location:</span>{" "}
                          {booking.return_delivery_address}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={UserCircle} title="Customer Information">
            <div className="grid gap-4 p-4 md:grid-cols-2 md:p-5">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <p className="font-semibold">{displayName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <p className="font-semibold">{displayPhone}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <p className="font-semibold">{displayEmail}</p>
              </div>
              {!isUser ? (
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Vehicle Operator (Owner)</Label>
                  <p className="font-semibold text-[#b38a00] dark:text-[#ffd700]">
                    {operatorDisplayName}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border p-4 md:p-5">
              <h3 className="mb-1 text-sm font-bold">Customer Documents & Verification Photos</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Uploaded IDs, billing proof and payment proof for this booking.
              </p>

              {documents.length ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {documents.map((document) => (
                    <BookingDocumentButton
                      key={document.key}
                      label={document.label}
                      url={document.url}
                      fileName={`${document.label}.jpg`}
                    />
                  ))}
                </div>
              ) : null}

              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {photos.map((photo, index) => {
                    const url = photoUrls[index] ?? "";
                    return (
                      <BookingPhotoThumbnail
                        key={photo.id}
                        url={url}
                        fileName={photo.file_name}
                        canDelete={canWrite}
                        deleteForm={
                          canWrite ? (
                            <form action={deleteBookingItemAction} className="absolute right-1 top-1 z-10">
                              <input type="hidden" name="type" value="photo" />
                              <input type="hidden" name="photo_id" value={photo.id} />
                              <input type="hidden" name="booking_id" value={booking.id} />
                              <input type="hidden" name="file_name" value={photo.file_name} />
                              <ConfirmSubmit
                                message="Are you sure you want to delete this document?"
                                title="Delete file"
                                className="flex size-6 items-center justify-center rounded-full bg-rose-600 text-white shadow hover:bg-rose-500"
                              >
                                &times;
                              </ConfirmSubmit>
                            </form>
                          ) : null
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">No customer photos uploaded yet.</p>
              )}
            </div>

            <div className="border-t border-border p-4 md:p-5">
              <h3 className="mb-3 text-sm font-bold">Customer Remarks & Notes History</h3>

              {booking.remarks || remarks.length > 0 ? (
                <div className="mb-3 space-y-2">
                  {booking.remarks ? (
                    <div className="rounded-lg border border-[#ffcc00]/40 bg-[#ffcc00]/5 px-4 py-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#b38a00] dark:text-[#ffd700]">
                          <StickyNote className="size-3.5" />
                          Initial Booking Notes / Remarks
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {booking.created_at ? formatDate(booking.created_at, "datetime") : "At booking creation"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{booking.remarks}</p>
                    </div>
                  ) : null}

                  {[...remarks].reverse().map((remark) => (
                    <div key={remark.id} className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#b38a00] dark:text-[#ffd700]">
                          Author #{remark.created_by ?? "system"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(remark.created_at, "datetime")}
                          </span>
                          {canWrite ? (
                            <form action={deleteBookingItemAction}>
                              <input type="hidden" name="type" value="remark" />
                              <input type="hidden" name="remark_id" value={remark.id} />
                              <input type="hidden" name="booking_id" value={booking.id} />
                              <ConfirmSubmit
                                message="Are you sure you want to delete this note?"
                                title="Delete note"
                                className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                              >
                                Delete
                              </ConfirmSubmit>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{remark.remark}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-3 text-sm italic text-muted-foreground">No remarks recorded yet.</p>
              )}

              {!isUser ? (
                <form action={addCustomerInfoAction} className="space-y-4" encType="multipart/form-data">
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold text-foreground">
                      Upload Verification IDs & Photos
                    </Label>
                    <FileUploadDropzone
                      name="customer_photos"
                      multiple
                      accept="image/*,.pdf"
                      maxSizeMB={5}
                      helperText="Drag & drop JPG, PNG or PDF documents (multiple allowed, max 5MB each)."
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_remark" className="mb-1.5 block text-xs font-bold text-foreground">
                      Add New Remark / Note
                    </Label>
                    <Textarea id="new_remark" name="new_remark" rows={3} placeholder="Type new remark or notes here..." />
                  </div>
                  <div className="text-right">
                    <LoadingButton type="submit" className="bg-[#ffcc00] font-bold text-black hover:bg-[#e6b800]">
                      Save Customer Updates
                    </LoadingButton>
                  </div>
                </form>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard icon={ClipboardList} title="Payment Breakdown">
            <div className="space-y-1.5 p-4 md:p-5">
              <div className="flex items-center justify-between text-sm">
                <span>Base Rental</span>
                <Money value={basePrice} className="font-semibold" />
              </div>
              {deliveryFee > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span className="font-semibold">+ <Money value={deliveryFee} /></span>
                </div>
              ) : null}
              {pickupFee > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span>Pickup Fee</span>
                  <span className="font-semibold">+ <Money value={pickupFee} /></span>
                </div>
              ) : null}
              {extensionFee > 0 ? (
                <div className="flex items-center justify-between text-sm">
                  <span>Extension Fee</span>
                  <span className="font-semibold">+ <Money value={extensionFee} /></span>
                </div>
              ) : null}
              {discountAmount > 0 ? (
                <div className="flex items-center justify-between text-sm text-rose-600 dark:text-rose-400">
                  <span>Discount</span>
                  <span className="font-semibold">- <Money value={discountAmount} /></span>
                </div>
              ) : null}
              <div className="my-2 border-t border-dashed border-border" />
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Total Rental</span>
                <Money value={totalRental} />
              </div>
              {downPayment > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Down Payment</span>
                    <span className="font-semibold">- <Money value={downPayment} /></span>
                  </div>
                  <div className="my-2 border-t border-dashed border-border" />
                </>
              ) : null}
              <div className="flex items-center justify-between pt-1 text-base font-extrabold text-[#b38a00] dark:text-[#ffd700]">
                <span>Remaining Balance</span>
                <Money value={remainingBal} />
              </div>
            </div>

            {canStatus && remainingBal > 0 ? (
              <div className="border-t border-border p-4">
                <PayBalanceDialog
                  bookingId={booking.id}
                  remainingBalance={remainingBal}
                  totalRental={totalRental}
                  alreadyPaid={downPayment}
                  customerName={displayName}
                />
              </div>
            ) : null}
          </SectionCard>

          {booking.remarks ? (
            <Card className="gap-2 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Booking Remarks</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p className="whitespace-pre-wrap text-sm">{booking.remarks}</p>
              </CardContent>
            </Card>
          ) : null}

          {canStatus ? (
            <SectionCard icon={FileText} title="Update Booking Status">
              <div className="p-4 md:p-5">
                <BookingActions
                  booking={{
                    id: booking.id,
                    booking_type: booking.booking_type,
                    fulfillment_type: booking.fulfillment_type,
                    delivery_address: booking.delivery_address,
                    start_date: booking.start_date,
                    end_date: booking.end_date,
                    pickup_time: booking.pickup_time,
                    return_time: booking.return_time,
                    total_price: booking.total_price,
                    down_payment: booking.down_payment,
                    status: booking.status,
                  }}
                  documents={documents}
                  canEdit
                  isAdmin={session.role === "admin"}
                />
              </div>
            </SectionCard>
          ) : null}

          <PrintButton />
        </div>
      </div>
    </>
  );
}
