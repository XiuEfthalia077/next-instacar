import * as React from "react";
import {
  CalendarDays,
  Car,
  FileText,
  Store,
  Truck,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingAttentionBadge } from "@/components/common/booking-attention-badge";
import { DocumentPreviewButton } from "@/components/admin/document-preview";
import type { BookingDocument } from "@/components/admin/document-preview";
import { Money } from "@/components/common/money";
import { StatusBadge } from "@/components/common/status-badge";
import type { BookingRow } from "@/lib/data/bookings";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatClock(time: string | null | undefined): string {
  if (!time) return "10:00 AM";
  const [h, m] = time.split(":");
  const hour = parseInt(h ?? "10", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

export function BookingMobileCard({
  booking,
  documents = [],
  creatorName,
  actorName,
  actionType,
  actionAt,
  branchName,
  actions,
  className,
}: {
  booking: BookingRow;
  documents?: BookingDocument[];
  creatorName?: string | null;
  actorName?: string | null;
  actionType?: string | null;
  actionAt?: string | null;
  branchName?: string | null;
  actions?: React.ReactNode;
  className?: string;
}) {
  const name = booking.guest_name || booking.users?.name || "Guest User";
  const isGuest = Boolean(booking.guest_name);
  const email = booking.gmail || booking.users?.email;
  const phone = booking.phone_number || booking.users?.phone;

  const basePrice = Number(booking.total_price ?? 0);
  const discountPrice = Number(booking.discount_price ?? 0);
  const downPayment = Number(booking.down_payment ?? 0);
  const total = basePrice + discountPrice + downPayment;
  const balance = Math.max(0, total - discountPrice - downPayment);

  const isDelivery = (booking.fulfillment_type ?? "Pickup").toLowerCase() === "delivery";
  const address = isDelivery
    ? booking.delivery_address || "No delivery address"
    : booking.delivery_address || (branchName ? `${branchName} - Branch Location` : "Main Branch");

  const files = documents.filter(
    (doc) => doc.key === "primary" || doc.key === "billing",
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-[#ffcc00]/60 space-y-3.5",
        className,
      )}
    >
      {/* Top Header Row: Booking ID & Badges on dedicated row to prevent customer name truncation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-black text-foreground bg-muted/80 px-2.5 py-1 rounded-md border border-border/40 shrink-0">
            #BK-{booking.id}
          </span>
          {isGuest && (
            <Badge
              variant="outline"
              className="border-border bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground shrink-0"
            >
              WALK-IN
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <StatusBadge status={booking.status} />
          <BookingAttentionBadge booking={booking} />
        </div>
      </div>

      {/* Customer Info Row: Unconstrained full-width with generous avatar and typography */}
      <div className="flex items-center gap-3 pt-0.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted font-black text-sm text-muted-foreground ring-1 ring-border shadow-xs">
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-base text-foreground leading-snug break-words">
            {name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {email || phone || "No Email / Contact"}
          </p>
        </div>
      </div>

      {/* Details Box: Generous padding, crisp typography, and clear section dividers */}
      <div className="space-y-2.5 rounded-xl bg-muted/25 p-3.5 sm:p-4 text-xs border border-border/50">
        {/* Vehicle */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0 font-bold text-sm text-foreground">
            <Car className="size-4 text-[#ffcc00] shrink-0" />
            <span className="truncate">
              {[booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "Vehicle"}
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-foreground bg-card px-2.5 py-1 rounded-md border border-border shrink-0 shadow-2xs">
            {booking.cars?.plate_number ?? "No plate"}
          </span>
        </div>

        {/* Schedule */}
        <div className="flex items-center justify-between gap-2 text-xs border-t border-border/40 pt-2.5 text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="size-3.5 shrink-0 text-sky-400" />
            <span className="text-foreground font-semibold truncate">
              {formatDate(booking.start_date)} &ndash; {formatDate(booking.end_date)}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] font-medium text-foreground/85">
            {formatClock(booking.pickup_time)} &ndash; {formatClock(booking.return_time)}
          </span>
        </div>

        {/* Fulfillment */}
        <div className="flex items-start gap-2 text-xs border-t border-border/40 pt-2.5 text-muted-foreground">
          {isDelivery ? (
            <Truck className="size-3.5 shrink-0 text-sky-400 mt-0.5" />
          ) : (
            <Store className="size-3.5 shrink-0 text-[#ffcc00] mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <span className="font-bold text-foreground mr-1.5">
              {isDelivery ? "Delivery:" : "Pickup:"}
            </span>
            <span className="text-muted-foreground break-words">{address}</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold">Total:</span>
            <Money value={total} className="font-black text-base text-foreground tabular-nums" />
          </div>

          {downPayment > 0 ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-500 font-bold">
                Paid: <Money value={downPayment} />
              </span>
              {balance > 0 && (
                <span className="text-rose-400 font-bold">
                  Bal: <Money value={balance} />
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Audit (if creator or actor available) */}
        {creatorName || actorName ? (
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground/80 border-t border-border/40 pt-2.5">
            <span className="flex items-center gap-1.5 truncate">
              <User className="size-3 shrink-0" />
              <span>Created by {creatorName ?? "System"}</span>
            </span>
            {actorName && (
              <span className="truncate shrink-0 font-medium">
                {actionType ?? "Updated"} by {actorName}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom Footer: Verification Files & Actions with Touch-Friendly Targets */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {files.length > 0 ? (
            files.map((document) => (
              <DocumentPreviewButton key={document.key} document={document} compact />
            ))
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
              <FileText className="size-3.5 opacity-50" />
              No documents
            </span>
          )}
        </div>

        <div className="shrink-0">{actions}</div>
      </div>
    </div>
  );
}
