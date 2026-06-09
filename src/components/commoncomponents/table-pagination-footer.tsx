"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PAGE_LIMIT,
  PAGE_LIMIT_OPTIONS,
  type PaginationMeta,
} from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TablePaginationFooterProps = {
  pagination: PaginationMeta;
  variant?: "top" | "bottom";
};

export default function TablePaginationFooter({
  pagination,
  variant = "bottom",
}: TablePaginationFooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Math.max(1, pagination.page);
  const totalPages = Math.max(1, pagination.totalPages);
  const limit = pagination.limit || DEFAULT_PAGE_LIMIT;
  const hasNextPage = pagination.total > limit;

  const limitOptions = useMemo(() => {
    const options = new Set<number>(PAGE_LIMIT_OPTIONS);
    if (limit > 0) options.add(limit);
    return [...options].sort((a, b) => a - b);
  }, [limit]);

  if (!hasNextPage) return null;

  const updatePagination = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => params.set(key, value));
    router.push(`${pathname}?${params.toString()}`);
  };

  const previousDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const pageButton = (page: number) => (
    <Button
      key={page}
      type="button"
      variant="outline"
      size="icon"
      onClick={() => updatePagination({ page: String(page) })}
      className={cn(
        "size-8 rounded-md border-slate-200 bg-white text-sm font-medium text-black hover:bg-slate-50",
        page === currentPage &&
          "border-[#6C63FF] bg-[#6C63FF] text-white hover:bg-[#6C63FF] hover:text-white",
      )}
    >
      {page}
    </Button>
  );

  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => {
      const start = Math.min(
        Math.max(1, currentPage - 2),
        Math.max(1, totalPages - 4),
      );
      return start + index;
    },
  ).filter((page) => page <= totalPages);

  const paginationNav = (
    <div className="flex items-center justify-center gap-2 overflow-x-auto sm:justify-start">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={previousDisabled}
        onClick={() => updatePagination({ page: String(currentPage - 1) })}
        className="px-0 font-medium text-black hover:bg-transparent"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      {pages[0] > 1 && (
        <>
          {pageButton(1)}
          <span className="px-1 text-sm text-slate-500">...</span>
        </>
      )}
      {pages.map(pageButton)}
      {pages[pages.length - 1] < totalPages && (
        <>
          <span className="px-1 text-sm text-slate-500">...</span>
          {pageButton(totalPages)}
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={nextDisabled}
        onClick={() => updatePagination({ page: String(currentPage + 1) })}
        className="px-0 font-medium text-black hover:bg-transparent"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  if (variant === "top") {
    return <div className="mb-3 hidden justify-end sm:flex">{paginationNav}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t bg-white px-3 py-3 text-sm text-slate-600 sm:flex-row sm:justify-between">
      {paginationNav}
      <div className="flex w-full items-center justify-center gap-3 sm:w-auto sm:justify-end">
        <Select
          value={String(limit)}
          onValueChange={(value) => updatePagination({ limit: value, page: "1" })}
        >
          <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 px-3 text-sm text-slate-700 shadow-none">
            <span>Showing</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {limitOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="whitespace-nowrap text-sm text-black">
          of {pagination.total}
        </span>
      </div>
    </div>
  );
}
