"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, X, Truck, Store, MapPin, Clock } from "lucide-react";
import Link from "next/link";

import { DataTable, TablePagination, type DataTableColumn } from "@/components/common/data-table";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { BookingAttentionBadge } from "@/components/common/booking-attention-badge";
import { BookingMobileCard } from "@/components/dashboard/booking-mobile-card";
import { OnlineBookingActions } from "@/components/admin/online-booking-actions";
import { DocumentPreviewButton, type BookingDocument } from "@/components/admin/document-preview";
import { VerificationFiles } from "@/components/common/verification-files";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/common/money";
import { formatDate } from "@/lib/datetime";
import type { BookingRow } from "@/lib/data/bookings";

function clock(value: string | null | undefined) {
  if (!value) return "\u2014";
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export type BranchSummary = {
  id: number;
  name: string;
  address: string | null;
};

export function OnlineBookingsTable({
  rows,
  documents,
  branches,
  filter,
  page,
  perPage,
  count,
}: {
  rows: BookingRow[];
  documents: BookingDocument[][];
  branches: BranchSummary[];
  filter: string;
  page: number;
  perPage: number;
  count: number;
}) {
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: "success" | "error";
  } | null>(null);

  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (filter && filter !== "All") params.set("filter", filter);
    if (nextPage > 1) params.set("page", String(nextPage));
    const q = params.toString();
    return `/admin/bookings_online${q ? `?${q}` : ""}`;
  };

  const handleOptimisticConfirm = (bookingId: number, newStatus: string) => {
    setOptimisticStatuses((prev) => ({ ...prev, [bookingId]: newStatus }));
    setToast({
      id: bookingId,
      message: `Booking #${bookingId} confirmed successfully!`,
      type: "success",
    });
    setTimeout(() => {
      setToast((curr) => (curr?.id === bookingId ? null : curr));
    }, 4500);
  };

  const handleError = (bookingId: number, errorMessage: string) => {
    setOptimisticStatuses((prev) => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
    setToast({
      id: bookingId,
      message: `Error updating booking: ${errorMessage}`,
      type: "error",
    });
    setTimeout(() => {
      setToast((curr) => (curr?.id === bookingId ? null : curr));
    }, 6000);
  };

  const columns: DataTableColumn<BookingRow>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (booking) => {
        const name = booking.users?.name ?? booking.guest_name ?? "Guest User";
        const email = booking.users?.email ?? booking.gmail ?? "No Email";
        const isVerified = Boolean(booking.users?.id_verified);
        const initials =
          name
            .split(" ")
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase() || "U";

        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            {/* Customer Initials Avatar Circle */}
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ffcc00]/15 text-xs font-black text-[#b38a00] dark:text-[#ffcc00] border border-[#ffcc00]/30 shadow-xs">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p
                  className="font-bold text-neutral-900 dark:text-neutral-100 text-sm truncate max-w-[150px]"
                  title={name}
                >
                  {name}
                </p>
                {isVerified && (
                  <span
                    title="Customer ID Verified on File"
                    className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                  >
                    <CheckCircle2 className="size-2.5" />
                    Verified
                  </span>
                )}
              </div>
              <p
                className="text-[11px] text-muted-foreground truncate max-w-[160px]"
                title={email}
              >
                {email}
              </p>
              <Badge
                variant="outline"
                className="mt-0.5 border-neutral-200 dark:border-neutral-800 bg-muted/40 px-1.5 py-0 text-[10px] font-mono font-bold text-muted-foreground"
              >
                #BK-{booking.id}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (booking) => (
        <div className="min-w-[150px]">
          <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
            {[booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "\u2014"}
          </p>
          <span className="inline-block mt-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-card px-2 py-0.5 font-mono text-[11px] font-bold text-neutral-900 dark:text-neutral-100 shadow-xs">
            {booking.cars?.plate_number ?? "No Plate"}
          </span>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (booking) => (
        <div className="min-w-[160px] text-xs space-y-0.5">
          <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
            {formatDate(booking.start_date)} &ndash; {formatDate(booking.end_date)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="size-3 text-muted-foreground shrink-0" />
            <span>
              {clock(booking.pickup_time)} &ndash; {clock(booking.return_time)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "fulfillment",
      header: "Fulfillment",
      cell: (booking) => {
        const isDelivery = (booking.fulfillment_type ?? "Pickup").toLowerCase() === "delivery";
        const branch =
          branchMap.get(booking.branch_id ?? 0) ??
          branchMap.get(booking.cars?.branch_id ?? 0);
        const address = isDelivery
          ? booking.delivery_address || "No address provided"
          : `${branch?.name ?? "Main Branch"} - ${branch?.address ?? "Branch Location"}`;

        return (
          <div className="min-w-[200px] space-y-1">
            <Badge
              variant="outline"
              className={
                isDelivery
                  ? "gap-1.5 border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-800 dark:text-sky-300"
                  : "gap-1.5 border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300"
              }
            >
              {isDelivery ? <Truck className="size-3" /> : <Store className="size-3" />}
              {isDelivery ? "Delivery" : "Pickup"}
            </Badge>
            <p className="flex items-start gap-1 text-[11px] text-muted-foreground max-w-[200px] line-clamp-2">
              <MapPin className="mt-0.5 size-3 shrink-0 text-rose-500" />
              <span title={address}>{address}</span>
            </p>
          </div>
        );
      },
    },
    {
      key: "files",
      header: "Verification Files",
      cell: (booking, index) => {
        const docs = documents[index] || [];
        const docMap = new Map(docs.map((d) => [d.key, d]));

        const fileItems = [
          {
            key: "primary",
            label: "ID 1",
            hasFile: Boolean(booking.primary_id_path),
            url: docMap.get("primary")?.url,
            isPdf: docMap.get("primary")?.isPdf,
          },
          {
            key: "secondary",
            label: "ID 2",
            hasFile: Boolean(booking.secondary_id_path),
            url: docMap.get("secondary")?.url,
            isPdf: docMap.get("secondary")?.isPdf,
          },
          {
            key: "billing",
            label: "Billing",
            hasFile: Boolean(booking.proof_billing_path),
            url: docMap.get("billing")?.url,
            isPdf: docMap.get("billing")?.isPdf,
          },
          {
            key: "payment",
            label: "Payment",
            hasFile: Boolean(booking.proof_payment_path),
            url: docMap.get("payment")?.url,
            isPdf: docMap.get("payment")?.isPdf,
          },
        ];

        return <VerificationFiles files={fileItems} />;
      },
    },
    {
      key: "pricing",
      header: "Pricing Data",
      cell: (booking) => {
        const total = Number(booking.total_price ?? 0);
        const down = Number(booking.down_payment ?? 0);
        const balance = Math.max(0, total - down);

        return (
          <div className="min-w-[130px] space-y-0.5">
            <Money
              value={total}
              className="block font-black text-sm text-neutral-900 dark:text-neutral-100"
            />
            {down > 0 && (
              <span className="block text-[11px] font-semibold text-muted-foreground">
                DP: <Money value={down} />
              </span>
            )}
            {balance > 0 ? (
              <span className="block text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
                Bal: <Money value={balance} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Fully Paid
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (booking) => {
        const currentStatus = optimisticStatuses[booking.id] ?? booking.status;
        return (
          <div
            className="flex flex-col items-center justify-center gap-1.5"
            data-testid={`status-cell-${booking.id}`}
          >
            <StatusBadge status={currentStatus} />
            <BookingAttentionBadge booking={booking} />
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      cell: (booking, index) => {
        const currentStatus = optimisticStatuses[booking.id] ?? booking.status;
        return (
          <OnlineBookingActions
            booking={{ ...booking, status: currentStatus }}
            filter={filter}
            documents={documents[index]}
            onOptimisticConfirm={(id, status) => handleOptimisticConfirm(id, status)}
            onError={(id, err) => handleError(id, err)}
          />
        );
      },
    },
  ];

  return (
    <>
      {/* Floating Optimistic Feedback Toast */}
      {toast ? (
        <div
          data-slot="optimistic-toast"
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "success"
              ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-200"
              : "border-rose-500/50 bg-rose-950/90 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-rose-400" />
          )}
          <span className="text-xs font-bold">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 rounded-md p-1 hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <SectionCard bodyClassName="p-0">
        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(booking) => String(booking.id)}
          emptyMessage="No online bookings found."
          renderMobileCard={(booking, index) => {
            const branch =
              branchMap.get(booking.branch_id ?? 0) ??
              branchMap.get(booking.cars?.branch_id ?? 0);
            const currentStatus = (optimisticStatuses[booking.id] ??
              booking.status) as BookingRow["status"];

            return (
              <BookingMobileCard
                booking={{ ...booking, status: currentStatus }}
                documents={documents[index]}
                branchName={branch?.name}
                actions={
                  <OnlineBookingActions
                    booking={{ ...booking, status: currentStatus }}
                    filter={filter}
                    documents={documents[index]}
                    onOptimisticConfirm={(id, status) => handleOptimisticConfirm(id, status)}
                    onError={(id, err) => handleError(id, err)}
                  />
                }
              />
            );
          }}
        />
      </SectionCard>

      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-card">
        <TablePagination
          page={page}
          pageSize={perPage}
          total={count}
          buildHref={buildHref}
        />
      </div>
    </>
  );
}
