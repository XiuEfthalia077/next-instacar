"use client";

import {
  Banknote,
  Car,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { peso } from "@/components/admin/finance-format";
import { RemittanceHistoryDialog } from "@/components/admin/remittance-history-dialog";
import type { RemittanceHistoryItem } from "@/components/admin/remittance-history-dialog";
import { RemittanceRecordDialog } from "@/components/admin/remittance-record-dialog";
import {
  remittanceStatus,
  RemittanceStatusBadge,
} from "@/components/admin/remittance-status-badge";
import type { RemittanceStatus } from "@/components/admin/remittance-status-badge";
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
import type { OperatorRemittanceCar } from "@/lib/data/finance";
import { wallClockTimestamp } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export type OperatorCarItem = OperatorRemittanceCar;

export type OperatorGroup = {
  operatorId: number;
  operatorName: string;
  totalOwed: number;
  totalPaid: number;
  balance: number;
  cars: OperatorCarItem[];
};

type OperatorRemittanceGroupProps = {
  groups: OperatorGroup[];
  rowsByCar: Record<number, RemittanceHistoryItem[]>;
  today: string;
};

function bookingHours(booking: OperatorCarItem["bookings"][number]): number {
  if (!booking.start_date || !booking.end_date) return 0;

  const start = wallClockTimestamp(
    booking.start_date,
    booking.pickup_time ?? "00:00:00",
  );
  const end = wallClockTimestamp(
    booking.end_date,
    booking.return_time ?? "00:00:00",
  );

  if (!(end > start)) return 0;
  return Math.round(((end - start) / 3_600_000) * 10) / 10;
}

/**
 * Detailed modal showing which specific cars and bookings make up the Operator's remittance.
 */
function OperatorBreakdownModal({
  group,
  rowsByCar,
  today,
  defaultOpen = false,
  trigger,
}: {
  group: OperatorGroup;
  rowsByCar: Record<number, RemittanceHistoryItem[]>;
  today: string;
  defaultOpen?: boolean;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [activeCarTab, setActiveCarTab] = React.useState<number | "all">("all");

  const status: RemittanceStatus = remittanceStatus(
    group.totalOwed,
    group.totalPaid,
  );
  const isClear = group.balance <= 0 && group.totalOwed > 0;

  const filteredCars =
    activeCarTab === "all"
      ? group.cars
      : group.cars.filter((c) => c.carId === activeCarTab);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0 sm:rounded-2xl border-border bg-[#0d0f12] text-foreground flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border/80 p-5 sm:p-6 pr-12 bg-card shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00] ring-1 ring-[#ffcc00]/40">
                <UserCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-extrabold text-foreground">
                    {group.operatorName}
                  </DialogTitle>
                  <RemittanceStatusBadge status={status} />
                </div>
                <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                  Remittance breakdown across {group.cars.length} registered vehicle
                  {group.cars.length === 1 ? "" : "s"}
                </DialogDescription>
              </div>
            </div>

            {/* Financial Summary KPIs */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Total Owed
                </p>
                <p className="text-sm font-extrabold text-foreground">
                  {peso(group.totalOwed)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Total Paid
                </p>
                <p className="text-sm font-extrabold text-emerald-500">
                  {peso(group.totalPaid)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Net Balance
                </p>
                <p
                  className={cn(
                    "text-sm font-extrabold",
                    isClear ? "text-emerald-500" : "text-rose-500",
                  )}
                >
                  {peso(group.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Vehicle Filter Tabs if > 2 cars */}
          {group.cars.length > 1 && (
            <div className="mt-4 flex gap-1.5 overflow-x-auto pt-1">
              <button
                type="button"
                onClick={() => setActiveCarTab("all")}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition",
                  activeCarTab === "all"
                    ? "bg-[#ffcc00] text-black shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                All Vehicles ({group.cars.length})
              </button>
              {group.cars.map((car) => {
                const name =
                  [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
                return (
                  <button
                    key={car.carId}
                    type="button"
                    onClick={() => setActiveCarTab(car.carId)}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition",
                      activeCarTab === car.carId
                        ? "bg-[#ffcc00] text-black shadow-xs"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {name} {car.plateNumber ? `[${car.plateNumber}]` : ""}
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        {/* Modal Body: Cars & Bookings Breakdown */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {filteredCars.map((car) => {
            const carStatus = remittanceStatus(car.totalOwed, car.totalPaid);
            const carClear = car.balance <= 0 && car.totalOwed > 0;
            const history = rowsByCar[car.carId] ?? [];
            const carName =
              [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
            const carLabel = car.plateNumber
              ? `${carName} [${car.plateNumber}]`
              : carName;

            return (
              <div
                key={car.carId}
                className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-xs"
              >
                {/* Vehicle Header Bar */}
                <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Car className="size-4 text-[#ffcc00]" />
                      <h4 className="text-base font-extrabold text-foreground">
                        {carName}
                      </h4>
                      {car.plateNumber && (
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                          {car.plateNumber}
                        </code>
                      )}
                      <RemittanceStatusBadge status={carStatus} />
                    </div>
                    {car.branchName && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Branch: {car.branchName}
                      </p>
                    )}
                  </div>

                  {/* Actions & Balances for this vehicle */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold">
                      <span className="text-muted-foreground">Owed:</span>
                      <span className="font-bold text-foreground">{peso(car.totalOwed)}</span>
                      <span className="text-muted-foreground">| Paid:</span>
                      <span className="font-bold text-emerald-500">{peso(car.totalPaid)}</span>
                      <span className="text-muted-foreground">| Balance:</span>
                      <span
                        className={cn(
                          "font-bold",
                          carClear ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {peso(car.balance)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <RemittanceRecordDialog
                        kind="operator"
                        targetId={car.carId}
                        label={carLabel}
                        meta={car.operatorName}
                        balance={car.balance}
                        today={today}
                      />
                      <RemittanceHistoryDialog
                        kind="operator"
                        label={carLabel}
                        items={history}
                      />
                    </div>
                  </div>
                </div>

                {/* Contributing Bookings Breakdown Table */}
                <div className="p-4">
                  <div className="mb-2.5 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="size-3.5 text-[#ffcc00]" />
                      Contributing Bookings ({car.bookings.length})
                    </span>
                    <span>Total Operator Share: {peso(car.totalOwed)}</span>
                  </div>

                  {car.bookings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No bookings recorded for this vehicle yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/80">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/80 bg-muted/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2.5 text-left">Booking #</th>
                            <th className="px-3 py-2.5 text-left">Rental Schedule</th>
                            <th className="px-3 py-2.5 text-left">Duration</th>
                            <th className="px-3 py-2.5 text-left">Type</th>
                            <th className="px-3 py-2.5 text-left">Status</th>
                            <th className="px-3 py-2.5 text-right">Operator Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {car.bookings.map((booking) => {
                            const hours = bookingHours(booking);
                            return (
                              <tr
                                key={booking.booking_id}
                                className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                              >
                                <td className="px-3 py-2.5 font-bold">
                                  <Link
                                    href={`/shared/booking_details?id=${booking.booking_id}`}
                                    className="font-mono text-[#ffcc00] hover:underline"
                                  >
                                    #{booking.booking_id}
                                  </Link>
                                </td>
                                <td className="px-3 py-2.5 font-medium text-foreground">
                                  {booking.start_date} → {booking.end_date}
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">
                                  {hours > 0 ? `${hours} hrs` : "—"}
                                </td>
                                <td className="px-3 py-2.5 capitalize text-muted-foreground">
                                  {booking.booking_type ?? "Online"}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold capitalize">
                                    {booking.booking_status ?? "Active"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-emerald-500">
                                  +{peso(booking.operator_share)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="border-t border-border/80 p-4 bg-card shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="font-bold">
              Close Breakdown
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OperatorRemittanceGroup({
  groups,
  rowsByCar,
  today,
}: OperatorRemittanceGroupProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          No operator remittance records match the selected filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const status: RemittanceStatus = remittanceStatus(
          group.totalOwed,
          group.totalPaid,
        );
        const isClear = group.balance <= 0 && group.totalOwed > 0;
        const hasBalanceToRemit = group.balance > 0;

        return (
          <div
            key={group.operatorId}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:border-[#ffcc00]/50"
          >
            {/* Consolidated Single Operator Block */}
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              {/* Operator Identity */}
              <div className="flex items-center gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00]/10 text-[#ffcc00] ring-1 ring-[#ffcc00]/30 shadow-xs">
                  <UserCheck className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-extrabold text-foreground">
                      {group.operatorName}
                    </h3>
                    <RemittanceStatusBadge status={status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-medium">
                    {group.cars.length} registered vehicle{group.cars.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {/* Remittance View: Total Owed, Total Paid, Net Balance */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="min-w-[100px] rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Total Owed
                    </p>
                    <p className="mt-0.5 text-sm font-extrabold text-foreground">
                      {peso(group.totalOwed)}
                    </p>
                  </div>
                  <div className="min-w-[100px] rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Total Paid
                    </p>
                    <p className="mt-0.5 text-sm font-extrabold text-emerald-500">
                      {peso(group.totalPaid)}
                    </p>
                  </div>
                  <div className="min-w-[100px] rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Net Balance
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-sm font-extrabold",
                        isClear ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {peso(group.balance)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons: View Breakdown & Remit */}
                <div className="flex items-center gap-2">
                  <OperatorBreakdownModal
                    group={group}
                    rowsByCar={rowsByCar}
                    today={today}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:bg-[#ffcc00]/10 hover:text-[#b38a00] active:scale-95"
                      >
                        <FileText className="size-4 text-[#ffcc00]" />
                        <span>View Breakdown</span>
                      </button>
                    }
                  />

                  <OperatorBreakdownModal
                    group={group}
                    rowsByCar={rowsByCar}
                    today={today}
                    trigger={
                      <button
                        type="button"
                        className={cn(
                          "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-black shadow-xs transition active:scale-95",
                          hasBalanceToRemit
                            ? "bg-[#ffcc00] text-black hover:bg-[#ffd633]"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                        title={
                          hasBalanceToRemit
                            ? "Remit outstanding balance"
                            : "No balance due"
                        }
                      >
                        <CircleDollarSign className="size-4" />
                        <span>Remit</span>
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
