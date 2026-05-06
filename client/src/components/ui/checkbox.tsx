import * as React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "h-4 w-4 cursor-pointer rounded border-input text-primary focus:ring-2 focus:ring-ring",
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
