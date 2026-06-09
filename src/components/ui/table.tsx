import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/50", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap border-r border-gray-300/40 px-2 text-left align-middle font-medium text-foreground last:border-r-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<"td"> & { title?: string }) {
  const content = title ? (
    <span title={title} className="block cursor-pointer truncate">
      {children}
    </span>
  ) : (
    children
  );

  return (
    <td
      className={cn(
        "whitespace-nowrap border-r border-gray-200/40 p-2 align-middle last:border-r-0",
        className,
      )}
      {...props}
    >
      {content}
    </td>
  );
}
