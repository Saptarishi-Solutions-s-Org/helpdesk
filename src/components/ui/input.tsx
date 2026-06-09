import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  search?: boolean;
};

export function Input({ className, type, search, ...props }: InputProps) {
  if (search) {
    return (
      <div
        className={cn(
          "flex min-h-9 w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1 text-base shadow-xs transition-[color,box-shadow,background-color] hover:bg-gray-100",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          type={type}
          className="w-full min-w-0 border-0 bg-transparent outline-none placeholder:text-gray-400 selection:bg-blue-500 selection:text-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      className={cn(
        "min-h-9.5 w-full min-w-0 rounded-md border border-gray-300 bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow,background-color] placeholder:text-gray-400 selection:bg-blue-500 selection:text-white hover:bg-gray-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
