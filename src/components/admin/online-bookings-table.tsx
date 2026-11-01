"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, X, Truck, Store, MapPin } from "lucide-react";
import Link from "next/link";

import { DataTable, TablePagination, type DataTableColumn } from "@/components/common/data-table";
import { SectionCard } from "@/components/common/section-card";
import { StatusBadge } from "@/components/common/status-badge";
import { BookingAttentionBadge } from "@/components/common/booking-attention-badge";
import { BookingMobileCard } from "@/components/dashboard/booking-mobile-card";
import { OnlineBookingActions } from "@/components/admin/online-booking-actions";
import { DocumentPreviewButton, type BookingDocument } from "@/components/admin/document-preview";
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
    // 1. Immediately reflect the status badge & disable action
    setOptimisticStatuses((prev) => ({ ...prev, [bookingId]: newStatus }));

    // 2. Immediate visual toast feedback
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
    // Rollback optimistic state
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
        return (
          <div className="min-w-[170px]">
            <p className="font-bold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Badge
              variant="outline"
              className="mt-1 border-border bg-muted/50 px-2 py-0 text-[10px] font-bold text-muted-foreground"
            >
              #BK-{booking.id}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (booking) => (
        <div className="min-w-[140px]">
          <p className="font-semibold text-foreground">
            {[booking.cars?.brand, booking.cars?.model].filter(Boolean).join(" ") || "\u2014"}
          </p>
          <Badge
            variant="outline"
            className="mt-1 border-border bg-muted/40 px-2 py-0 text-[11px] font-semibold text-muted-foreground"
          >
            {booking.cars?.plate_number ?? "No plate"}
          </Badge>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      cell: (booking) => (
        <div className="min-w-[150px] text-sm">
          <p className="font-medium text-foreground">
            {formatDate(booking.start_date)} &ndash; {formatDate(booking.end_date)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {clock(booking.pickup_time)} &ndash; {clock(booking.return_time)}
          </p>
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
          <div className="min-w-[190px]">
            <Badge
              variant="outline"
              className={
                isDelivery
                  ? "gap-1 border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                  : "gap-1 border-border bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground"
              }
            >
              {isDelivery ? <Truck className="size-3" /> : <Store className="size-3" />}
              {isDelivery ? "Delivery" : "Pickup"}
            </Badge>
            <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 size-3 shrink-0 text-rose-500" />
              <span>{address}</span>
            </p>
          </div>
        );
      },
    },
    {
      key: "files",
      header: "Files",
      cell: (_booking, index) => (
        <div className="flex max-w-[180px] flex-wrap gap-1">
          {documents[index]?.length ? (
            documents[index].map((document) => (
              <DocumentPreviewButton
                key={document.key}
                document={document}
                compact
              />
            ))
          ) : (
            <span className="text-sm text-muted-foreground">&mdash;</span>
          )}
        </div>
      ),
    },
    {
      key: "pricing",
      header: "Pricing Data",
      cell: (booking) => {
        const total = Number(booking.total_price ?? 0);
        const down = Number(booking.down_payment ?? 0);
        return (
          <div className="min-w-[130px]">
            <Money value={total} className="block font-bold text-foreground" />
            {down > 0 ? (
              <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                DP: <Money value={down} />
              </span>
            ) : null}
            <span className="block text-[11px] font-bold text-[#b38a00] dark:text-[#ffd700]">
              Bal: <Money value={Math.max(0, total - down)} />
            </span>
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
          <div className="flex flex-col items-center justify-center gap-1.5" data-testid={`status-cell-${booking.id}`}>
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
            const currentStatus = (optimisticStatuses[booking.id] ?? booking.status) as BookingRow["status"];

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

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
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
