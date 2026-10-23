import { Banknote, CircleCheck, Store, Wallet } from "lucide-react";

import { peso } from "@/components/admin/finance-format";
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
import { requireRole } from "@/lib/auth";
import { connection } from "next/server";
import { staffFeeRemittances } from "@/lib/data/finance";
import { manilaToday } from "@/lib/datetime";
import { readFlash, searchParam } from "@/lib/flash";
import { remittanceProofUrlMap } from "@/lib/remittance-proofs";
import { cn } from "@/lib/utils";

/**
 * Staff Fee Remittances — port of `car-rental/pages/admin/remittance.php`.
 *
 * Each active branch is a card with the delivery + pickup fees it is owed,
 * the amount already remitted and the outstanding balance. A payment modal and
 * a history modal (with signed proof URLs and delete confirmation) reproduce
 * the legacy Bootstrap modals.
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

export default async function AdminRemittancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const selectedStatus = statusFilter(searchParam(params, "status"));

  const { branches, rows } = await staffFeeRemittances(session);

  const branchScope =
    session.viewBranch === "all" ? null : Number(session.viewBranch);

  const branchLabel =
    branchScope === null
      ? "All Branches"
      : (branches.find((branch) => branch.branchId === branchScope)?.branchName ??
        "Selected Branch");

  // Legacy applies the derived status filter before the KPI totals, so the
  // cards and the three numbers always agree.
  const scopedBranches = branches.filter(
    (branch) => branchScope === null || branch.branchId === branchScope,
  );

  const visibleBranches = scopedBranches.filter(
    (branch) =>
      selectedStatus === "all" ||
      remittanceStatus(branch.totalOwed, branch.totalPaid) === selectedStatus,
  );

  const totalOwed = visibleBranches.reduce(
    (sum, branch) => sum + branch.totalOwed,
    0,
  );
  const totalPaid = visibleBranches.reduce(
    (sum, branch) => sum + branch.totalPaid,
    0,
  );
  const totalBalance = totalOwed - totalPaid;

  const visibleBranchIds = new Set(
    visibleBranches.map((branch) => branch.branchId),
  );

  const visibleRows = rows.filter(
    (row) =>
      row.branch_id !== null && visibleBranchIds.has(row.branch_id),
  );

  const urlMap = await remittanceProofUrlMap(
    visibleRows.flatMap((row) => row.photos),
  );

  const rowsByBranch = new Map<number, RemittanceHistoryItem[]>();

  for (const row of visibleRows) {
    if (row.branch_id === null) continue;

    const list = rowsByBranch.get(row.branch_id) ?? [];
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
    rowsByBranch.set(row.branch_id, list);
  }

  const today = manilaToday();

  const gridItems: SearchableGridItem[] = visibleBranches.map((branch) => {
    const status = remittanceStatus(branch.totalOwed, branch.totalPaid);
    const isClear = branch.balance <= 0 && branch.totalOwed > 0;
    const history = rowsByBranch.get(branch.branchId) ?? [];

    return {
      key: String(branch.branchId),
      search: branch.branchName.toLowerCase(),
      node: (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffd700] hover:shadow-[0_0_0_1px_#ffd700,0_6px_18px_-6px_rgba(255,215,0,0.5)]">
          <div className="flex items-start justify-between gap-2 border-b border-border p-4 md:p-5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-base font-extrabold text-foreground">
                <Store className="size-4 shrink-0 text-[#b38a00] dark:text-[#ffd700]" />
                <span className="truncate">{branch.branchName}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Staff fee tracking
              </p>
            </div>
            <RemittanceStatusBadge status={status} />
          </div>

          <div className="grid grid-cols-1 gap-2 border-b border-border p-4 sm:grid-cols-3">
            <MoneyBox label="Owed" value={branch.totalOwed} />
            <MoneyBox label="Paid" value={branch.totalPaid} tone="paid" />
            <MoneyBox
              label="Balance"
              value={branch.balance}
              tone={isClear ? "balance-clear" : "balance-due"}
            />
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 bg-[#fffbe6] p-3 dark:bg-[#1a1600]">
            <RemittanceRecordDialog
              kind="staff"
              targetId={branch.branchId}
              label={branch.branchName}
              balance={branch.balance}
              today={today}
            />

            <RemittanceHistoryDialog
              kind="staff"
              label={branch.branchName}
              items={history}
            />
          </div>
        </div>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title="Staff Remittances"
        subtitle={branchLabel}
        description="Track delivery and pickup fees owed to each branch's staff."
      />

      <Flash {...flash} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <StatCard
          label="Total Staff Fees"
          value={<Money value={totalOwed} />}
          hint="Sum of delivery + pickup fees"
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
          hint="Fees owed minus paid"
          icon={Wallet}
          tone={totalBalance > 0 ? "danger" : "success"}
        />
      </div>

      <SearchableGrid
        key={selectedStatus}
        items={gridItems}
        resetHref="/admin/remittance"
        searchId="branchSearch"
        searchPlaceholder="Search branch name..."
        emptyTitle="No branches found"
        emptyDescription="Either no branches exist, or the filters you set returned nothing."
        noMatchTitle="No branches match your search"
        noMatchDescription="Try a different branch name."
        filterControls={
          <FilterField label="Status" className="max-w-[220px]">
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
        }
      />
    </>
  );
}
