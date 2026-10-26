import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [50, 100, 200];

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      for (let i = startPage; i <= endPage; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalCount === 0) return null;

  const navButtonClass =
    "app-focus inline-flex h-11 min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border border-app-line bg-app-card px-3 text-xs font-semibold text-app-ink transition-colors hover:bg-app-soft disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-app-muted">
        <span className="whitespace-nowrap">
          Showing {start}–{end} of {totalCount}
        </span>
        <label className="sr-only" htmlFor="pagination-page-size">
          Rows per page
        </label>
        <select
          id="pagination-page-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="app-focus h-11 rounded-control border border-app-line bg-app-card px-3 text-xs font-semibold text-app-ink"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className={navButtonClass}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {getVisiblePages().map((page, index) =>
            typeof page === "string" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1.5 text-xs text-app-subtle"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={currentPage === page ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={cn(
                  "app-focus inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-control border text-xs font-semibold transition-colors",
                  currentPage === page
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-app-line bg-app-card text-app-muted hover:bg-app-soft hover:text-app-ink",
                )}
              >
                {page}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className={navButtonClass}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
