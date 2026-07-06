import * as React from "react";

import { cn } from "@/lib/utils";

export function getCurrencySymbol(currencyCode: string): string {
  return currencyCode === "GHS" ? "GH₵" : currencyCode;
}

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  currencyCode?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, currencyCode = "GHS", ...props }, ref) => {
    return (
      <div className="flex h-10 w-full items-stretch overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <span className="flex shrink-0 items-center border-r border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
          {getCurrencySymbol(currencyCode)}
        </span>
        <input
          type="number"
          ref={ref}
          className={cn(
            "flex w-full min-w-0 bg-transparent px-3 py-2 text-right text-base placeholder:text-muted-foreground placeholder:opacity-60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
