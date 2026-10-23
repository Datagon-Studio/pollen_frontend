import { isValidElement, ReactNode, useMemo, useState } from "react";
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
import { EmptyState, IllustrationName } from "@/components/ui/empty-state";
import { compareSortValues, SortableValue } from "@/lib/table-sort";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => SortableValue;
  sortFn?: (a: T, b: T) => number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowClassName?: (item: T) => string;
  emptyMessage?: string;
  emptyIllustration?: IllustrationName;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
}

const UNSORTABLE_KEYS = new Set(["actions", "select"]);

function isSortableColumn<T>(column: Column<T>): boolean {
  if (column.sortable === false) return false;
  if (!column.header.trim()) return false;
  if (UNSORTABLE_KEYS.has(column.key)) return false;
  return true;
}

function reactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join(" ");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return reactNodeToText(props.children);
  }
  return "";
}

function columnSortValue<T extends object>(
  item: T,
  column: Column<T>,
): SortableValue {
  if (column.sortValue) return column.sortValue(item);
  const raw = (item as Record<string, unknown>)[column.key];
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }
  if (raw instanceof Date) return raw;
  if (column.render) return reactNodeToText(column.render(item)).replace(/\s+/g, " ").trim();
  return "";
}

export function DataTable<T extends object>({
  columns,
  data,
  rowClassName,
  emptyMessage = "No data available",
  emptyIllustration = "empty-mailbox",
  sortColumn = null,
  sortDirection = null,
  onSort,
}: DataTableProps<T>) {
  const [internalColumn, setInternalColumn] = useState<string | null>(null);
  const [internalDirection, setInternalDirection] = useState<SortDirection>("asc");
  const controlled = Boolean(onSort);
  const activeColumn = controlled ? sortColumn : internalColumn;
  const activeDirection = controlled ? sortDirection : internalDirection;

  const handleSort = (column: Column<T>) => {
    if (!isSortableColumn(column)) return;

    const newDirection: SortDirection =
      activeColumn === column.key && activeDirection === "asc" ? "desc" : "asc";

    if (onSort) {
      onSort(column.key, newDirection);
      return;
    }

    setInternalColumn(column.key);
    setInternalDirection(newDirection);
  };

  const displayData = useMemo(() => {
    if (controlled || !activeColumn || !activeDirection) return data;
    const column = columns.find((item) => item.key === activeColumn);
    if (!column || !isSortableColumn(column)) return data;
    const sorted = [...data].sort((a, b) =>
      column.sortFn
        ? column.sortFn(a, b)
        : compareSortValues(columnSortValue(a, column), columnSortValue(b, column)),
    );
    return activeDirection === "desc" ? sorted.reverse() : sorted;
  }, [activeColumn, activeDirection, columns, controlled, data]);

  const getSortIcon = (column: Column<T>) => {
    if (activeColumn !== column.key || !activeDirection) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-50" aria-hidden="true" />;
    }
    if (activeDirection === "asc") {
      return <ArrowUp className="h-3.5 w-3.5 ml-1" aria-hidden="true" />;
    }
    return <ArrowDown className="h-3.5 w-3.5 ml-1" aria-hidden="true" />;
  };

  const renderCell = (item: T, column: Column<T>) =>
    column.render
      ? column.render(item)
      : ((item as Record<string, unknown>)[column.key] as ReactNode);

  const sortButton = (column: Column<T>) => (
    <Button
      type="button"
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
  );

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="sm:hidden">
        {displayData.length > 0 && (
          <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
            {columns.filter(isSortableColumn).map((column) => (
              <div key={column.key} className="shrink-0">
                {sortButton(column)}
              </div>
            ))}
          </div>
        )}
        {displayData.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              illustration={emptyIllustration}
              size="table"
              description={emptyMessage}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {displayData.map((item, index) => (
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
                  aria-sort={
                    isSortableColumn(column)
                      ? activeColumn === column.key
                        ? activeDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                >
                  {isSortableColumn(column) ? sortButton(column) : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8">
                  <EmptyState
                    illustration={emptyIllustration}
                    size="table"
                    description={emptyMessage}
                  />
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item, index) => (
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
