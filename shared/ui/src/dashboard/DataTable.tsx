import { useState, type ReactNode } from "react";
import { Skeleton } from "../primitives/Skeleton.js";
import { EmptyState } from "../primitives/EmptyState.js";
import { ErrorState } from "../primitives/ErrorState.js";
import { Button } from "../primitives/Button.js";
import { cn } from "../utils/cn.js";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Pagination is cursor/page-based to mirror the platform's API pagination model (shared/platform/api/pagination). */
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  skeletonRowCount?: number;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyTitle = "No records yet",
  emptyDescription = "Once records are created, they'll show up here.",
  emptyAction,
  sortKey,
  sortDirection = "asc",
  onSortChange,
  page,
  pageCount,
  onPageChange,
  onRowClick,
  skeletonRowCount = 5,
  className,
}: DataTableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | undefined>(sortKey);
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(sortDirection);

  const activeSortKey = sortKey ?? internalSortKey;
  const activeSortDirection = sortKey ? sortDirection : internalSortDirection;

  function handleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return;
    const nextDirection: SortDirection = activeSortKey === column.key && activeSortDirection === "asc" ? "desc" : "asc";
    if (onSortChange) {
      onSortChange(column.key, nextDirection);
    } else {
      setInternalSortKey(column.key);
      setInternalSortDirection(nextDirection);
    }
  }

  if (error) {
    return <ErrorState title="Couldn't load this table" description={error} onRetry={onRetry} className={className} />;
  }

  return (
    <div className={cn("fos-data-table-wrapper", className)}>
      <table className="fos-data-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = activeSortKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("fos-data-table-th", column.align && `fos-data-table-align-${column.align}`)}
                  aria-sort={column.sortable ? (isActive ? (activeSortDirection === "asc" ? "ascending" : "descending") : "none") : undefined}
                >
                  {column.sortable ? (
                    <button type="button" className="fos-data-table-sort-btn" onClick={() => handleSort(column)}>
                      {column.header}
                      <span className="fos-data-table-sort-icon" aria-hidden="true">
                        {isActive ? (activeSortDirection === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.key} className="fos-data-table-td">
                      <Skeleton className="fos-data-table-skeleton-cell" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={cn("fos-data-table-row", onRowClick && "fos-data-table-row-clickable")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("fos-data-table-td", column.align && `fos-data-table-align-${column.align}`)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {!isLoading && rows.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}

      {!isLoading && rows.length > 0 && pageCount !== undefined && pageCount > 1 && page !== undefined && onPageChange && (
        <nav className="fos-data-table-pagination" aria-label="Table pagination">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <span className="fos-data-table-page-status">
            Page {page} of {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
