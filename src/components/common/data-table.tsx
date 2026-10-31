import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** Right aligned numeric columns. */
  numeric?: boolean;
  className?: string;
  cell: (row: T, index: number) => React.ReactNode;
};

/**
 * Table shell used by every listing page.
 *
 * The legacy app used DataTables with server side rendering; the new app
 * keeps the same look but relies on normal pagination links so the pages
 * stay fully server rendered.
 */
export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  emptyMessage = "No records found.",
  className,
  footer,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor?: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <Table className="min-w-[640px] sm:min-w-[720px] md:min-w-full">
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground",
                    column.numeric && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={keyExtractor ? keyExtractor(row, index) : index}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "text-sm",
                        column.numeric && "text-right tabular-nums",
                        column.className,
                      )}
                    >
                      {column.cell(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {footer ? (
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Simple pagination footer.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing <strong className="text-foreground">{from}</strong> to{" "}
        <strong className="text-foreground">{to}</strong> of{" "}
        <strong className="text-foreground">{total}</strong> records
      </span>

      <div className="flex items-center gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          scroll={false}
          data-no-loader="true"
          className={cn(
            "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-card px-3.5 py-2 font-semibold transition-colors hover:bg-muted",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          Previous
        </Link>
        <span className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-card px-3.5 py-2 font-semibold text-foreground">
          Page {page} of {pages}
        </span>
        <Link
          href={buildHref(Math.min(pages, page + 1))}
          aria-disabled={page >= pages}
          scroll={false}
          data-no-loader="true"
          className={cn(
            "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-card px-3.5 py-2 font-semibold transition-colors hover:bg-muted",
            page >= pages && "pointer-events-none opacity-40",
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
