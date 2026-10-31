import {
  CalendarCheck,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Store,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  AddUserDialog,
  DeleteUserDialog,
  EditUserDialog,
} from "@/components/admin/user-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/empty-state";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { PillTabs } from "@/components/common/pill-tabs";
import { TablePagination } from "@/components/common/data-table";
import { requireRole } from "@/lib/auth";
import { connection } from "next/server";
import { listBranches } from "@/lib/data/cars";
import { readPage, readPerPage } from "@/lib/data/scope";
import { listUsers } from "@/lib/data/users";
import { readFlash, searchParam } from "@/lib/flash";
import { cn } from "@/lib/utils";

const ROLES = ["user", "staff", "operator", "admin"] as const;
type ManagedRole = (typeof ROLES)[number];

const ROLE_TABS: { role: ManagedRole; label: string }[] = [
  { role: "staff", label: "Staff" },
  { role: "admin", label: "Admins" },
  { role: "operator", label: "Operators" },
  { role: "user", label: "Customers" },
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Legacy `date('M d, Y', strtotime($user['created_at']))`. */
function formatJoined(value: string | null) {
  if (!value) return "—";
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) return "—";
  return stamp.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

function MetaRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{children}</span>
    </div>
  );
}

/**
 * Admin user directory — port of `car-rental/pages/admin/users.php`.
 *
 * The role comes from `?role=` (the legacy page defaulted to `user`), the
 * search box and pagination are plain GET parameters and the add / edit /
 * delete flows live in the client dialogs under `src/components/admin/`.
 */
export const instant = false;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireRole("admin");
  const params = await searchParams;
  const flash = readFlash(params);

  const requestedRole = searchParam(params, "role");
  const role: ManagedRole = ROLES.includes(requestedRole as ManagedRole)
    ? (requestedRole as ManagedRole)
    : "user";

  const search = searchParam(params, "search")?.trim() || undefined;
  const page = readPage(params.page);
  const perPage = readPerPage(params.perPage);

  const [{ rows, count }, branches] = await Promise.all([
    listUsers(session, { role, search, page, perPage }),
    listBranches(true),
  ]);

  const roleLabel = capitalize(role);
  const rolePlural = `${role}s`;

  const buildHref = (nextPage: number) => {
    const query = new URLSearchParams();
    query.set("role", role);
    if (search) query.set("search", search);
    if (perPage !== 25) query.set("perPage", String(perPage));
    if (nextPage > 1) query.set("page", String(nextPage));
    return `/admin/users?${query.toString()}`;
  };

  const branchOptions = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
  }));

  return (
    <>
      <PageHeader
        title={`${roleLabel} Management`}
        description={`Total: ${count} registered account${count === 1 ? "" : "s"}.`}
        actions={
          <AddUserDialog role={role} branches={branchOptions} />
        }
      />

      <Flash {...flash} />

      <PillTabs
        className="mb-4"
        tabs={ROLE_TABS.map((tab) => ({
          label: tab.label,
          href: `/admin/users?role=${tab.role}`,
          active: tab.role === role,
        }))}
      />

      {/* Toolbar: search + count */}
      <form
        method="get"
        className="mb-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-4"
      >
        <input type="hidden" name="role" value={role} />
        {perPage !== 25 ? (
          <input type="hidden" name="perPage" value={perPage} />
        ) : null}

        <div className="relative w-full sm:max-w-[420px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search by name, email, or phone…"
            className="h-10 rounded-[10px] bg-background pl-9"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-bold text-foreground">{rows.length}</span> of{" "}
            {count}
          </span>
          <Button type="submit" size="sm" className="font-bold">
            Search
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`No ${rolePlural} found.`}
          description={`Click Add New ${roleLabel} to create one.`}
          className="rounded-2xl border border-dashed border-border bg-card p-5"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((user) => {
            const branchName = user.branches?.name ?? null;
            const phone = user.phone?.trim() ? user.phone : "No phone";

            return (
              <article
                key={user.id}
                className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#ffcc00] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.05)]"
              >
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <UserRound className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h3
                        className="truncate text-base font-bold text-foreground"
                        title={user.name}
                      >
                        {user.name}
                      </h3>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#ffcc00]/15 px-2.5 py-[3px] text-[0.72rem] font-semibold capitalize tracking-wide text-[#926c00] dark:bg-[#ffcc00]/12 dark:text-[#ffcc00]">
                        <ShieldCheck className="size-3" />
                        {role}
                      </span>
                    </div>
                  </div>

                  <hr className="my-3 border-border" />

                  <div className="space-y-2">
                    <MetaRow icon={Mail}>
                      <span title={user.email}>{user.email}</span>
                    </MetaRow>

                    <MetaRow icon={Phone}>{phone}</MetaRow>

                    <MetaRow icon={Store}>
                      {branchName ? (
                        branchName
                      ) : (
                        <em className="text-muted-foreground">No branch</em>
                      )}
                    </MetaRow>

                    <MetaRow icon={CalendarCheck}>
                      Joined {formatJoined(user.created_at)}
                    </MetaRow>
                  </div>

                  {!user.is_verified ? (
                    <div className="mt-3">
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                      >
                        <TriangleAlert className="size-3" />
                        Unverified
                      </Badge>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                  <EditUserDialog
                    role={role}
                    branches={branchOptions}
                    user={{
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      phone: user.phone,
                      branchId: user.branch_id,
                    }}
                  />
                  <DeleteUserDialog
                    role={role}
                    user={{ id: user.id, name: user.name }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {count > 0 ? (
        <div className={cn("mt-4 overflow-hidden rounded-2xl border border-border bg-card")}>
          <TablePagination
            page={page}
            pageSize={perPage}
            total={count}
            buildHref={buildHref}
          />
        </div>
      ) : null}

      {search ? (
        <div className="mt-3 text-center">
          <Link
            href={`/admin/users?role=${role}`}
            className="text-xs font-semibold text-[#b38a00] hover:underline dark:text-[#ffcc00]"
          >
            Clear search
          </Link>
        </div>
      ) : null}
    </>
  );
}
