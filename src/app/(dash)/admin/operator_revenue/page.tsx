import { Banknote, CircleCheck, Search, Users, Wallet } from "lucide-react";
import { connection } from "next/server";

import {
  OperatorRemittanceGroup,
  type OperatorGroup,
} from "@/components/admin/operator-remittance-group";
import type { RemittanceHistoryItem } from "@/components/admin/remittance-history-dialog";
import {
  remittanceStatus,
} from "@/components/admin/remittance-status-badge";
import type { RemittanceStatus } from "@/components/admin/remittance-status-badge";
import { FilterBar, FilterField, filterControlClass } from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { Money } from "@/components/common/money";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { getSupabase, requireRole } from "@/lib/auth";
import { listBranches } from "@/lib/data/cars";
import { operatorRemittances } from "@/lib/data/finance";
import { fetchRows } from "@/lib/data/scope";
import { manilaToday } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { remittanceProofUrlMap } from "@/lib/remittance-proofs";

/**
 * Operator Remittances — Centralized view grouped by Car Owner (Operator).
 * Each owner displays a single summary block with total owed, paid, and balance,
 * which can be expanded to view the breakdown of specific cars and record payments.
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
  const searchQuery = searchParam(params, "search")?.toLowerCase().trim() || "";

  const rawOperator = searchParam(params, "operator_id") ?? "all";
  const parsedOperator = Number.parseInt(rawOperator, 10);
  const selectedOperator =
    rawOperator !== "all" && Number.isFinite(parsedOperator)
      ? parsedOperator
      : null;

  const [{ cars, rows }, branches, operators] = await Promise.all([
    operatorRemittances(session),
    listBranches(),
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

  const visibleCars = scopedCars.filter((car) => {
    if (
      selectedStatus !== "all" &&
      remittanceStatus(car.totalOwed, car.totalPaid) !== selectedStatus
    ) {
      return false;
    }

    if (searchQuery) {
      const matchCar = [car.brand, car.model, car.plateNumber, car.operatorName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!matchCar.includes(searchQuery)) return false;
    }

    return true;
  });

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

  const rowsByCarRecord: Record<number, RemittanceHistoryItem[]> = {};

  for (const row of visibleRows) {
    if (row.car_id === null) continue;

    const list = rowsByCarRecord[row.car_id] ?? [];
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
    rowsByCarRecord[row.car_id] = list;
  }

  // Group visible cars by Operator Owner
  const groupsMap = new Map<number, OperatorGroup>();

  for (const car of visibleCars) {
    const opId = car.operatorId ?? 0;
    const opName = car.operatorName ?? `Operator #${opId}`;
    let grp = groupsMap.get(opId);
    if (!grp) {
      grp = {
        operatorId: opId,
        operatorName: opName,
        totalOwed: 0,
        totalPaid: 0,
        balance: 0,
        cars: [],
      };
      groupsMap.set(opId, grp);
    }
    grp.totalOwed += car.totalOwed;
    grp.totalPaid += car.totalPaid;
    grp.balance += car.balance;
    grp.cars.push(car);
  }

  const groups = Array.from(groupsMap.values());
  const today = manilaToday();

  return (
    <>
      <PageHeader
        title="Centralized Operator Remittance"
        subtitle={branchLabel}
        description="Centralized operator revenue tracking with single consolidated operator cards and detailed breakdown modals."
      />

      <Flash {...flash} />

      {/* KPI Overview */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Total Operators"
          value={groups.length}
          hint="Owners with activity"
          icon={Users}
        />
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
            <span className="text-emerald-500">
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
                  ? "text-rose-500"
                  : "text-emerald-500"
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

      {/* Filters */}
      <FilterBar
        actions={
          <button
            type="submit"
            className="h-10 rounded-xl bg-[#ffcc00] px-5 text-sm font-bold text-black transition hover:bg-[#ffd633]"
          >
            Filter
          </button>
        }
      >
        <FilterField label="Search Vehicle / Operator">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Car brand, model, plate, or owner..."
              className={`${filterControlClass} pl-9`}
            />
          </div>
        </FilterField>

        <FilterField label="Operator">
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

        <FilterField label="Status">
          <select
            name="status"
            defaultValue={selectedStatus}
            className={filterControlClass}
          >
            <option value="all">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="no-activity">No Activity</option>
          </select>
        </FilterField>
      </FilterBar>

      {/* Centralized Grouped Remittances List */}
      <div className="mt-4">
        <OperatorRemittanceGroup
          groups={groups}
          rowsByCar={rowsByCarRecord}
          today={today}
        />
      </div>
    </>
  );
}
