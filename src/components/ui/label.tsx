import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn("flex items-center gap-1 text-sm font-medium leading-none", className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500">*</span>}
    </LabelPrimitive.Root>
  );
}
