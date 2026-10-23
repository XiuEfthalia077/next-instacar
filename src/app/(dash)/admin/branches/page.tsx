import { CircleCheck, Store } from "lucide-react";

import {
  BranchToggleDialog,
  EditBranchDialog,
  NewBranchDialog,
} from "@/components/admin/branch-dialogs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { requireRole } from "@/lib/auth";
import { listBranchesWithCounts } from "@/lib/data/misc";
import { readFlash } from "@/lib/flash";
import { cn } from "@/lib/utils";

/**
 * Branch Management — port of `car-rental/pages/admin/branches.php`.
 *
 * The legacy page showed one card per branch with the Staff / Operators,
 * Cars and Bookings counters plus an activate / deactivate action; the
 * counters come from `listBranchesWithCounts()`.
 */
export const instant = false;

export default async function AdminBranchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const branches = await listBranchesWithCounts();

  const totalBranches = branches.length;
  const activeBranches = branches.filter((branch) => branch.is_active).length;

  return (
    <>
      <PageHeader
        title="Branch Management"
        description="Manage physical locations and assign staff, cars, and bookings."
        actions={<NewBranchDialog />}
      />

      <Flash {...flash} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Branches" value={totalBranches} icon={Store} />
        <StatCard label="Active" value={activeBranches} icon={CircleCheck} />
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No branches yet"
          description='Click "New Branch" to create your first location.'
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={cn(
                "group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-[#ffcc00] hover:shadow-[0_12px_24px_-10px_rgba(255,204,0,0.3)]",
                !branch.is_active && "opacity-70 hover:opacity-100",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ffcc00] to-[#ffe066] text-black shadow-[0_4px_12px_rgba(255,204,0,0.3)] transition-transform group-hover:scale-105">
                  <Store className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-[1.05rem] font-extrabold leading-tight text-foreground"
                    title={branch.name}
                  >
                    {branch.name}
                  </h3>
                  <p className="mb-1 truncate text-[0.78rem] text-muted-foreground">
                    {branch.address || "No address set"}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 rounded-full border-transparent px-2.5 py-[3px] text-[0.68rem] font-bold",
                      branch.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
                    )}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {branch.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3.5">
                <div className="flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors hover:bg-[#ffcc00]/8">
                  <span className="text-[1.1rem] font-extrabold leading-none text-foreground">
                    {branch.staff_count.toLocaleString("en-PH")}
                  </span>
                  <span className="text-center text-[0.62rem] font-bold uppercase leading-[1.15] tracking-[0.05em] text-muted-foreground">
                    Staff / Operators
                  </span>
                </div>

                <div className="flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors hover:bg-[#ffcc00]/8">
                  <span className="text-[1.1rem] font-extrabold leading-none text-foreground">
                    {branch.car_count.toLocaleString("en-PH")}
                  </span>
                  <span className="text-center text-[0.62rem] font-bold uppercase leading-[1.15] tracking-[0.05em] text-muted-foreground">
                    Cars
                  </span>
                </div>

                <div className="flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 transition-colors hover:bg-[#ffcc00]/8">
                  <span className="text-[1.1rem] font-extrabold leading-none text-foreground">
                    {branch.booking_count.toLocaleString("en-PH")}
                  </span>
                  <span className="text-center text-[0.62rem] font-bold uppercase leading-[1.15] tracking-[0.05em] text-muted-foreground">
                    Bookings
                  </span>
                </div>
              </div>

              <div className="flex gap-2 border-t border-border pt-3">
                <EditBranchDialog
                  branch={{
                    id: branch.id,
                    name: branch.name,
                    address: branch.address,
                    phone: branch.phone,
                  }}
                />

                <BranchToggleDialog
                  branch={{
                    id: branch.id,
                    name: branch.name,
                    is_active: branch.is_active,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
