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
        "rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs transition-all hover:border-[#ffcc00]/50",
        className,
      )}
    >
      {/* Top Row: Customer Avatar, Name, Badges & Status */}
      <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-black text-xs text-muted-foreground ring-1 ring-border">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-foreground truncate">
                {name}
              </span>
              {isGuest && (
                <Badge
                  variant="outline"
                  className="border-border bg-secondary px-1.5 py-0 text-[9px] font-bold text-secondary-foreground shrink-0"
                >
                  WALK-IN
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="font-mono text-[11px] font-black text-foreground bg-muted/80 px-1.5 py-0.5 rounded shrink-0">
                #BK-{booking.id}
              </span>
              <span className="truncate text-[11px]">
                {email || phone || "No Email"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={booking.status} />
          <BookingAttentionBadge booking={booking} />
        </div>
      </div>

      {/* Middle Grid: Vehicle, Schedule, Fulfillment, Pricing */}
      <div className="mt-2.5 space-y-2 rounded-xl bg-muted/20 p-2.5 text-xs border border-border/40">
        {/* Vehicle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 font-bold text-foreground">
            <Car className="size-3.5 text-[#ffcc00] shrink-0" />
            <span className="truncate">
              {[booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "Vehicle"}
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-muted-foreground bg-card px-2 py-0.5 rounded border border-border shrink-0">
            {booking.cars?.plate_number ?? "No plate"}
          </span>
        </div>

        {/* Schedule */}
        <div className="flex items-center justify-between gap-2 text-muted-foreground text-[11px] border-t border-border/30 pt-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarDays className="size-3.5 shrink-0 text-sky-400" />
            <span className="text-foreground font-medium truncate">
              {formatDate(booking.start_date)} &ndash; {formatDate(booking.end_date)}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px]">
            {formatClock(booking.pickup_time)} &ndash; {formatClock(booking.return_time)}
          </span>
        </div>

        {/* Fulfillment */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/30 pt-1.5">
          {isDelivery ? (
            <Truck className="size-3.5 shrink-0 text-sky-400" />
          ) : (
            <Store className="size-3.5 shrink-0 text-[#ffcc00]" />
          )}
          <span className="font-bold text-foreground shrink-0">
            {isDelivery ? "Delivery:" : "Pickup:"}
          </span>
          <span className="truncate text-muted-foreground">{address}</span>
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-semibold">Total:</span>
            <Money value={total} className="font-black text-sm text-foreground tabular-nums" />
            {downPayment > 0 && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                (Paid: <Money value={downPayment} />)
              </span>
            )}
          </div>
          {balance > 0 && downPayment > 0 ? (
            <span className="text-[10px] font-bold text-rose-500">
              Bal: <Money value={balance} />
            </span>
          ) : null}
        </div>

        {/* Audit (if creator or actor available) */}
        {creatorName || actorName ? (
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground border-t border-border/30 pt-1.5">
            <span className="flex items-center gap-1 truncate">
              <User className="size-3 shrink-0" />
              <span>Created by {creatorName ?? "System"}</span>
            </span>
            {actorName && (
              <span className="truncate shrink-0 font-medium opacity-80">
                {actionType ?? "Updated"} by {actorName}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom Footer: Files & Actions */}
      <div className="mt-2.5 flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {files.length > 0 ? (
            files.map((document) => (
              <DocumentPreviewButton key={document.key} document={document} compact />
            ))
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground italic">
              <FileText className="size-3 opacity-60" />
              No documents
            </span>
          )}
        </div>

        <div className="shrink-0">{actions}</div>
      </div>
    </div>
  );
}
