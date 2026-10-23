import { Hourglass, MessageSquareText, Star } from "lucide-react";
import Link from "next/link";

import { ReviewReplyDialog } from "@/components/admin/review-reply-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/data-table";
import {
  FilterBar,
  FilterField,
  filterControlClass,
} from "@/components/common/filter-bar";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabase, requireRole } from "@/lib/auth";
import {
  listReviews,
  pendingReplyCount,
  type ReviewRow,
} from "@/lib/data/misc";
import { fetchRows } from "@/lib/data/scope";
import { REVIEW_STATUSES } from "@/lib/constants";
import { readFlash, searchParam } from "@/lib/flash";

/**
 * Admin review moderation — port of `car-rental/pages/admin/review_list.php`.
 *
 * Stats are company-wide in the legacy page (`COUNT(reviews)` /
 * `AVG(rating)`), so the totals below are read with a small inline query; the
 * listing itself goes through `listReviews()` with the rating / review-status
 * / reply filters. The layout renders `DashboardShell`.
 */
export const instant = false;

export default async function AdminReviewListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("admin");

  const params = await searchParams;
  const flash = readFlash(params);

  const ratingParam = searchParam(params, "rating");
  const rating = ratingParam && /^[1-5]$/.test(ratingParam) ? Number(ratingParam) : null;

  const statusParam = searchParam(params, "status");
  const status =
    statusParam && (REVIEW_STATUSES as readonly string[]).includes(statusParam)
      ? statusParam
      : null;

  const replyParam = searchParam(params, "reply");
  const reply =
    replyParam === "pending_reply" || replyParam === "replied" ? replyParam : null;

  const search = (searchParam(params, "search") ?? "").trim();

  const [reviews, pending] = await Promise.all([
    listReviews(session, { rating, status, reply }),
    pendingReplyCount(session),
  ]);

  // Legacy KPI queries: `SELECT COUNT(id) FROM reviews` and
  // `SELECT AVG(rating) FROM reviews` (global, not branch scoped).
  const supabase = await getSupabase();
  const ratingRows = await fetchRows<{ rating: number | null }>(
    supabase.from("reviews").select("rating"),
  );

  const rated = ratingRows.filter(
    (row): row is { rating: number } => typeof row.rating === "number",
  );
  const totalReviews = ratingRows.length;
  const averageRating = rated.length
    ? (rated.reduce((sum, row) => sum + row.rating, 0) / rated.length).toFixed(1)
    : "0.0";

  const needle = search.toLowerCase();
  const rows = needle
    ? reviews.filter((review) =>
        [
          review.customer_name,
          review.brand,
          review.model,
          review.plate_number,
          review.review_title,
          review.review_text,
        ].some((value) => (value ?? "").toLowerCase().includes(needle)),
      )
    : reviews;

  const columns: DataTableColumn<ReviewRow>[] = [
    {
      key: "customer",
      header: "Customer",
      className: "px-4",
      cell: (review) => (
        <div>
          <div className="font-bold text-foreground">
            {review.customer_name ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            ID: #BK-{review.booking_id ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (review) => (
        <div>
          <div className="font-semibold text-foreground">
            {[review.brand, review.model].filter(Boolean).join(" ") || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {review.plate_number ?? "—"}
          </div>
        </div>
      ),
    },
    {
      key: "feedback",
      header: "Feedback",
      className: "whitespace-normal",
      cell: (review) => (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold text-amber-500">
            {Number(review.rating ?? 0).toFixed(1)} ★
          </div>
          <span className="max-w-[250px] truncate text-xs text-muted-foreground">
            {review.review_title ?? "—"}
          </span>
          {review.admin_reply ? (
            <div className="max-w-[250px] truncate rounded-md border-l-[3px] border-[#ffcc00] bg-muted px-2 py-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Admin: </span>
              {review.admin_reply}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      cell: (review) => {
        const replied = Boolean(review.admin_reply);

        return (
          <StatusBadge
            status={replied ? "Replied" : "Pending"}
            className={
              replied
                ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            }
          />
        );
      },
    },
    {
      key: "action",
      header: "Action",
      className: "px-4 text-right",
      cell: (review) => (
        <div className="flex justify-end">
          <ReviewReplyDialog
            review={{
              id: review.id,
              rating: review.rating,
              review_title: review.review_title,
              review_text: review.review_text,
              admin_reply: review.admin_reply,
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Review Management"
        description="Monitor and respond to customer feedback"
      />

      <Flash {...flash} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Reviews"
          value={totalReviews}
          hint="All submitted"
          icon={MessageSquareText}
        />
        <StatCard
          label="Average Rating"
          value={
            <span className="text-amber-500">
              {averageRating} <span className="text-lg">★</span>
            </span>
          }
          hint="Overall score"
          icon={Star}
        />
        <StatCard
          label="Pending Replies"
          value={<span className="text-amber-500">{pending}</span>}
          hint="Awaiting response"
          icon={Hourglass}
        />
      </div>

      <FilterBar
        actions={
          <>
            <Button type="submit" size="sm">
              Filter
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/review_list">Reset</Link>
            </Button>
          </>
        }
      >
        <FilterField label="Search Feedback" className="min-w-[220px] flex-[2]">
          <Input
            name="search"
            defaultValue={search}
            placeholder="Customer, car, plate number..."
            className={filterControlClass}
          />
        </FilterField>

        <FilterField label="Rating" className="max-w-[170px]">
          <select
            name="rating"
            defaultValue={rating ? String(rating) : ""}
            className={filterControlClass}
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} Stars
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Status" className="max-w-[190px]">
          <select
            name="status"
            defaultValue={status ?? ""}
            className={filterControlClass}
          >
            <option value="">All Statuses</option>
            {REVIEW_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Reply" className="max-w-[190px]">
          <select
            name="reply"
            defaultValue={reply ?? ""}
            className={filterControlClass}
          >
            <option value="">All Replies</option>
            <option value="pending_reply">Pending Reply</option>
            <option value="replied">Replied</option>
          </select>
        </FilterField>
      </FilterBar>

      <SectionCard bodyClassName="p-0">
        <DataTable
          className="rounded-none border-0 shadow-none"
          columns={columns}
          rows={rows}
          keyExtractor={(review) => String(review.id)}
          emptyMessage="No system records matches found."
        />
      </SectionCard>
    </>
  );
}
