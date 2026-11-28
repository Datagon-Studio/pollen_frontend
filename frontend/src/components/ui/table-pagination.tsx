import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PAGE_SIZE_OPTIONS,
  usePageSizeChoice,
  writePageSizeChoice,
  type PageSizeChoice,
} from "@/hooks/usePagination";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
}: TablePaginationProps) {
  const pageSizeChoice = usePageSizeChoice();
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  if (totalItems <= 0) {
    return null;
  }

  const goToPage = () => {
    const next = Number(pageInput);
    if (!Number.isFinite(next)) {
      setPageInput(String(page));
      return;
    }
    onPageChange(Math.min(totalPages, Math.max(1, Math.floor(next))));
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Rows
          <select
            value={pageSizeChoice}
            onChange={(event) => {
              const value = event.target.value;
              const next: PageSizeChoice = value === "all" ? "all" : (Number(value) as PageSizeChoice);
              writePageSizeChoice(next);
            }}
            aria-label="Rows per page"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </label>
        {totalPages > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Page
              <Input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value.replace(/[^\d]/g, ""))}
                onBlur={goToPage}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    goToPage();
                  }
                }}
                inputMode="numeric"
                aria-label="Go to page"
                className="h-8 w-14 px-2 text-center"
              />
              of {totalPages}
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
