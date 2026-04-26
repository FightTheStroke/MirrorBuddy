"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TouchTargetProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

/**
 * TouchTarget Wrapper Component
 *
 * Ensures WCAG 2.1 AA compliant minimum touch target size of 44x44px.
 * Wraps interactive elements with invisible padding to expand touch area
 * while keeping visual content unchanged.
 *
 * @example
 * ```tsx
 * // Simple button
 * <TouchTarget>
 *   <button>Click me</button>
 * </TouchTarget>
 *
 * // Icon button
 * <TouchTarget>
 *   <Icon size={24} />
 * </TouchTarget>
 *
 * // With custom class
 * <TouchTarget className="custom-styling">
 *   <a href="/page">Link</a>
 * </TouchTarget>
 * ```
 *
 * The component uses Tailwind's `inline-flex` with `min-w` and `min-h`
 * to ensure minimum dimensions while centering content.
 */
const TouchTarget = React.forwardRef<HTMLSpanElement, TouchTargetProps>(
  ({ children, className, asChild: _asChild = false, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Flexbox layout for centering
          "inline-flex items-center justify-center",
          // Minimum touch target size (44px = WCAG 2.1 AA requirement)
          "min-w-[44px] min-h-[44px]",
          // Preserve parent positioning context
          "relative",
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);
TouchTarget.displayName = "TouchTarget";

export { TouchTarget };
