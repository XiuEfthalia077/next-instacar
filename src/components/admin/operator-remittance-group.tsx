"use client";

import {
  Car,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  UserCheck,
} from "lucide-react";
import * as React from "react";

import { peso } from "@/components/admin/finance-format";
import { OperatorBookingsDialog } from "@/components/admin/operator-bookings-dialog";
import { RemittanceHistoryDialog } from "@/components/admin/remittance-history-dialog";
import type { RemittanceHistoryItem } from "@/components/admin/remittance-history-dialog";
import { RemittanceRecordDialog } from "@/components/admin/remittance-record-dialog";
import {
  remittanceStatus,
  RemittanceStatusBadge,
} from "@/components/admin/remittance-status-badge";
import type { RemittanceStatus } from "@/components/admin/remittance-status-badge";
import { Money } from "@/components/common/money";
import type { OperatorRemittanceCar } from "@/lib/data/finance";
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

function MoneyBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "paid" | "balance-clear" | "balance-due";
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
      <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-base font-extrabold tabular-nums",
          tone === "paid" && "text-emerald-500",
          tone === "balance-clear" && "text-emerald-500",
          tone === "balance-due" && "text-rose-500",
        )}
      >
        {peso(value)}
      </p>
    </div>
  );
}

export function OperatorRemittanceGroup({
  groups,
  rowsByCar,
  today,
}: OperatorRemittanceGroupProps) {
  // Track expanded operators (default all expanded if <= 3, else first expanded)
  const [expandedIds, setExpandedIds] = React.useState<number[]>(() =>
    groups.length <= 3 ? groups.map((g) => g.operatorId) : [groups[0]?.operatorId ?? 0],
  );

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

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
        const isExpanded = expandedIds.includes(group.operatorId);
        const status: RemittanceStatus = remittanceStatus(
          group.totalOwed,
          group.totalPaid,
        );
        const isClear = group.balance <= 0 && group.totalOwed > 0;

        return (
          <div
            key={group.operatorId}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200"
          >
            {/* Operator Summary Block Header */}
            <div className="flex flex-col gap-4 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffcc00]/10 text-[#ffcc00] ring-1 ring-[#ffcc00]/30">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-foreground">
                      {group.operatorName}
                    </h3>
                    <RemittanceStatusBadge status={status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.cars.length} registered vehicle{group.cars.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-card px-3 py-1.5 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Total Owed
                    </p>
                    <p className="font-extrabold text-foreground">{peso(group.totalOwed)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-1.5 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Total Paid
                    </p>
                    <p className="font-extrabold text-emerald-500">
                      {peso(group.totalPaid)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-1.5 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">
                      Net Balance
                    </p>
                    <p
                      className={cn(
                        "font-extrabold",
                        isClear ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {peso(group.balance)}
                    </p>
                  </div>
                </div>

                {/* Expand / Collapse Button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(group.operatorId)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-bold text-foreground transition hover:border-[#ffcc00] hover:text-[#b38a00]"
                >
                  <span>
                    {isExpanded ? "Hide Breakdown" : `View Cars (${group.cars.length})`}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Car Breakdown Section */}
            {isExpanded ? (
              <div className="divide-y divide-border/60 bg-card p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Vehicles Owned by {group.operatorName}</span>
                  <span>Specific Revenue & Remittance Actions</span>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-2 lg:grid-cols-3">
                  {group.cars.map((car) => {
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
                        className="flex flex-col overflow-hidden rounded-xl border border-border bg-muted/20 transition hover:border-[#ffcc00]/50"
                      >
                        {/* Car Card Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-border/80 p-3.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Car className="size-4 text-[#ffcc00]" />
                              <p className="truncate text-sm font-bold text-foreground">
                                {carName}
                              </p>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              {car.plateNumber ? (
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-foreground">
                                  {car.plateNumber}
                                </code>
                              ) : null}
                              {car.branchName ? <span>• {car.branchName}</span> : null}
                            </div>
                          </div>
                          <RemittanceStatusBadge status={carStatus} />
                        </div>

                        {/* Money Box Grid */}
                        <div className="grid grid-cols-3 gap-1.5 border-b border-border/60 p-3">
                          <MoneyBox label="Owed" value={car.totalOwed} />
                          <MoneyBox label="Paid" value={car.totalPaid} tone="paid" />
                          <MoneyBox
                            label="Balance"
                            value={car.balance}
                            tone={carClear ? "balance-clear" : "balance-due"}
                          />
                        </div>

                        {/* Car Remittance Actions */}
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5">
                          <RemittanceRecordDialog
                            kind="operator"
                            targetId={car.carId}
                            label={carLabel}
                            meta={car.operatorName}
                            balance={car.balance}
                            today={today}
                          />

                          <div className="flex items-center gap-1.5">
                            <OperatorBookingsDialog
                              label={carLabel}
                              bookings={car.bookings}
                            />
                            <RemittanceHistoryDialog
                              kind="operator"
                              label={carLabel}
                              items={history}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
