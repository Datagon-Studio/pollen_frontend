import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSizeChoice = (typeof PAGE_SIZE_OPTIONS)[number] | "all";

const STORAGE_KEY = "pollean.rowsPerPage";
const CHANGE_EVENT = "pollean-rows-per-page";
const DEFAULT_PAGE_SIZE: PageSizeChoice = 10;

function isPageSize(value: number): value is (typeof PAGE_SIZE_OPTIONS)[number] {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

export function readPageSizeChoice(): PageSizeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "all") return "all";
    const parsed = Number(raw);
    if (isPageSize(parsed)) return parsed;
  } catch {
    // Storage can be unavailable.
  }
  return DEFAULT_PAGE_SIZE;
}

export function writePageSizeChoice(choice: PageSizeChoice) {
  localStorage.setItem(STORAGE_KEY, String(choice));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function usePageSizeChoice(): PageSizeChoice {
  const [choice, setChoice] = useState<PageSizeChoice>(readPageSizeChoice);

  useEffect(() => {
    const sync = () => setChoice(readPageSizeChoice());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return choice;
}

export const DEFAULT_PAGE_SIZE = 10;

export function usePagination<T>(
  items: T[],
  _pageSize?: number,
  resetKey?: string | number
) {
  const choice = usePageSizeChoice();
  const pageSize = choice === "all" ? Math.max(items.length, 1) : choice;
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey, choice]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    pageSize,
    pageSizeChoice: choice,
    rangeStart,
    rangeEnd,
    showPagination: totalItems > pageSize,
  };
}
