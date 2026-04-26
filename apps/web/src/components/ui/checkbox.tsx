"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, indeterminate, checked, onCheckedChange, onChange, ...props },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLInputElement>) || innerRef;

    React.useEffect(() => {
      if (combinedRef.current) {
        combinedRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate, combinedRef]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    const isChecked = indeterminate || checked;

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={combinedRef}
          checked={checked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded border border-slate-300 dark:border-slate-600",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "transition-colors duration-150",
            isChecked &&
              "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500",
            !isChecked && "bg-white dark:bg-slate-800",
            className,
          )}
          aria-hidden="true"
        >
          {indeterminate ? (
            <Minus className="h-3 w-3 text-white m-0.5" strokeWidth={3} />
          ) : checked ? (
            <Check className="h-3 w-3 text-white m-0.5" strokeWidth={3} />
          ) : null}
        </div>
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
