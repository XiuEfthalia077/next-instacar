import { Banknote, CircleCheck, Wallet } from "lucide-react";

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
import { SearchableGrid } from "@/components/admin/searchable-grid";
import type { SearchableGridItem } from "@/components/admin/searchable-grid";
import { Flash } from "@/components/common/flash";
import { FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { getSupabase, requireRole } from "@/lib/auth";
import { connection } from "next/server";
import { listBranches } from "@/lib/data/cars";
import { operatorRemittances } from "@/lib/data/finance";
import { fetchRows } from "@/lib/data/scope";
import { manilaToday } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { remittanceProofUrlMap } from "@/lib/remittance-proofs";
import { cn } from "@/lib/utils";

/**
 * Operator Remittances — port of `car-rental/pages/admin/operator_revenue.php`.
 *
 * One card per operator-owned car with the company's outstanding share, the
 * amount already remitted and the remaining balance. The card keeps the
 * legacy "View Bookings", "Record Payment" and "Payment History" actions.
 */

const STATUS_VALUES: RemittanceStatus[] = [
  "unpaid",
  "partial",
  "paid",
  "no-activity",
];

type StatusFilter = RemittanceStatus | "all";

function statusFilter(value: string | undefined): StatusFilter {
  return STATUS_VALUES.includes(value as RemittanceStatus)
    ? (value as RemittanceStatus)
    : "all";
}

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
    <div className="rounded-xl bg-muted/50 px-2 py-2.5 text-center">
      <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-base font-extrabold tabular-nums",
          tone === "paid" && "text-emerald-700 dark:text-emerald-400",
          tone === "balance-clear" && "text-emerald-700 dark:text-emerald-400",
          tone === "balance-due" && "text-rose-700 dark:text-rose-400",
        )}
      >
        {peso(value)}
      </p>
    </div>
  );
}

export const instant = false;

export default async function AdminOperatorRevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const selectedStatus = statusFilter(searchParam(params, "status"));

  const rawOperator = searchParam(params, "operator_id") ?? "all";
  const parsedOperator = Number.parseInt(rawOperator, 10);
  const selectedOperator =
    rawOperator !== "all" && Number.isFinite(parsedOperator)
      ? parsedOperator
      : null;

  const [{ cars, rows }, branches, operators] = await Promise.all([
    operatorRemittances(session),
    listBranches(),
    // Missing read-only query: the legacy page loaded every operator for its
    // filter dropdown; no data-layer helper exists for that yet.
    getSupabase().then((supabase) =>
      fetchRows<{ id: number; name: string | null }>(
        supabase
          .from("users")
          .select("id, name")
          .eq("role", "operator")
          .order("name", { ascending: true }),
      ),
    ),
  ]);

  const branchLabel =
    session.viewBranch === "all"
      ? "All Branches"
      : (branches.find((branch) => branch.id === session.viewBranch)?.name ??
        "Selected Branch");

  const scopedCars = cars.filter(
    (car) => selectedOperator === null || car.operatorId === selectedOperator,
  );

  const visibleCars = scopedCars.filter(
    (car) =>
      selectedStatus === "all" ||
      remittanceStatus(car.totalOwed, car.totalPaid) === selectedStatus,
  );

  const totalOwed = visibleCars.reduce((sum, car) => sum + car.totalOwed, 0);
  const totalPaid = visibleCars.reduce((sum, car) => sum + car.totalPaid, 0);
  const totalBalance = totalOwed - totalPaid;

  const visibleCarIds = new Set(visibleCars.map((car) => car.carId));

  const visibleRows = rows.filter(
    (row) => row.car_id !== null && visibleCarIds.has(row.car_id),
  );

  const urlMap = await remittanceProofUrlMap(
    visibleRows.flatMap((row) => row.photos),
  );

  const rowsByCar = new Map<number, RemittanceHistoryItem[]>();

  for (const row of visibleRows) {
    if (row.car_id === null) continue;

    const list = rowsByCar.get(row.car_id) ?? [];
    list.push({
      id: row.id,
      amount: Number(row.amount ?? 0),
      paymentDate: row.payment_date,
      notes: row.notes,
      recordedByName: row.recorded_by_name,
      proofs: row.photos.map((photo) => ({
        id: photo.id,
        name: photo.file_name,
        url: urlMap.get(photo.id) ?? "",
        isPdf: /\.pdf$/i.test(photo.file_name),
      })),
    });
    rowsByCar.set(row.car_id, list);
  }

  const today = manilaToday();

  const gridItems: SearchableGridItem[] = visibleCars.map((car) => {
    const status = remittanceStatus(car.totalOwed, car.totalPaid);
    const isClear = car.balance <= 0 && car.totalOwed > 0;
    const history = rowsByCar.get(car.carId) ?? [];

    const carName = [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle";
    const carLabel = car.plateNumber
      ? `${carName} [${car.plateNumber}]`
      : carName;

    return {
      key: String(car.carId),
      search: [car.brand, car.model, car.plateNumber, car.operatorName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      node: (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffd700] hover:shadow-[0_0_0_1px_#ffd700,0_6px_18px_-6px_rgba(255,215,0,0.5)]">
          <div className="flex items-start justify-between gap-2 border-b border-border p-4 md:p-5">
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-foreground">
                {carName}
                {car.plateNumber ? (
                  <span className="pl-1 text-sm font-semibold text-muted-foreground">
                    · {car.plateNumber}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Owned by{" "}
                <strong className="font-bold text-foreground">
                  {car.operatorName ?? "Unknown Operator"}
                </strong>
                {car.branchName ? ` · ${car.branchName}` : ""}
              </p>
            </div>
            <RemittanceStatusBadge status={status} />
          </div>

          <div className="grid grid-cols-1 gap-2 border-b border-border p-4 sm:grid-cols-3">
            <MoneyBox label="Owed" value={car.totalOwed} />
            <MoneyBox label="Paid" value={car.totalPaid} tone="paid" />
            <MoneyBox
              label="Balance"
              value={car.balance}
              tone={isClear ? "balance-clear" : "balance-due"}
            />
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 bg-[#fffbe6] p-3 dark:bg-[#1a1600]">
            <RemittanceRecordDialog
              kind="operator"
              targetId={car.carId}
              label={carLabel}
              meta={car.operatorName}
              balance={car.balance}
              today={today}
            />

            <div className="flex flex-wrap items-center gap-2">
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
      ),
    };
  });

  return (
    <>
      <PageHeader
        title="Operator Remittances"
        subtitle={branchLabel}
        description="Track what the company owes operators and record payments."
      />

      <Flash {...flash} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <StatCard
          label="Total Owed"
          value={<Money value={totalOwed} />}
          hint="Sum of all operator shares"
          icon={Banknote}
          tone="primary"
        />
        <StatCard
          label="Total Paid"
          value={
            <span className="text-emerald-700 dark:text-emerald-400">
              <Money value={totalPaid} />
            </span>
          }
          hint="All recorded remittances"
          icon={CircleCheck}
          tone="success"
        />
        <StatCard
          label="Outstanding Balance"
          value={
            <span
              className={
                totalBalance > 0
                  ? "text-rose-700 dark:text-rose-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }
            >
              <Money value={totalBalance} />
            </span>
          }
          hint="Owed minus paid"
          icon={Wallet}
          tone={totalBalance > 0 ? "danger" : "success"}
        />
      </div>

      <SearchableGrid
        key={`${selectedOperator ?? "all"}:${selectedStatus}`}
        items={gridItems}
        resetHref="/admin/operator_revenue"
        searchId="carSearch"
        searchPlaceholder="Search car, plate, or operator..."
        emptyTitle="No operator cars found"
        emptyDescription="Either no operator cars exist, or the filters you set returned nothing."
        noMatchTitle="No cars match your search"
        noMatchDescription="Try a different car name, plate, or operator."
        filterControls={
          <>
            <FilterField label="Operator" className="max-w-[240px]">
              <select
                name="operator_id"
                defaultValue={
                  selectedOperator === null ? "all" : String(selectedOperator)
                }
                className={filterControlClass}
              >
                <option value="all">All Operators</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name ?? `Operator #${operator.id}`}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Status" className="max-w-[200px]">
              <select
                name="status"
                defaultValue={selectedStatus}
                className={filterControlClass}
              >
                <option value="all">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="no-activity">No Activity</option>
              </select>
            </FilterField>
          </>
        }
      />
    </>
  );
}
