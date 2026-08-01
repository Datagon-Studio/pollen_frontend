import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowClassName?: (item: T) => string;
  emptyMessage?: string;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowClassName,
  emptyMessage = "No data available",
  sortColumn = null,
  sortDirection = null,
  onSort,
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;

    let newDirection: SortDirection = "asc";
    if (sortColumn === column.key) {
      if (sortDirection === "asc") {
        newDirection = "desc";
      } else if (sortDirection === "desc") {
        newDirection = null;
      }
    }

    onSort(column.key, newDirection);
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable || sortColumn !== column.key) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 ml-1" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-3.5 w-3.5 ml-1" />;
    }
    return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />;
  };

  const renderCell = (item: T, column: Column<T>) =>
    column.render ? column.render(item) : (item[column.key] as ReactNode);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Mobile: stacked labeled rows — tables don't fit ~320–640px */}
      <div className="sm:hidden">
        {data.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((item, index) => (
              <li
                key={index}
                className={cn(
                  "px-4 py-3.5 space-y-2.5",
                  rowClassName?.(item),
                )}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="flex items-start justify-between gap-3 min-w-0"
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0 pt-0.5">
                      {column.header}
                    </span>
                    <div
                      className={cn(
                        "text-sm text-right min-w-0 break-words",
                        column.className,
                      )}
                    >
                      {renderCell(item, column)}
                    </div>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tablet/desktop: traditional table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    column.className,
                  )}
                >
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort(column)}
                    >
                      <span className="flex items-center">
                        {column.header}
                        {getSortIcon(column)}
                      </span>
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={index}
                  className={cn("hover:bg-secondary/30", rowClassName?.(item))}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {renderCell(item, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
