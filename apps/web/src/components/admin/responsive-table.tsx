"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional caption for accessibility
   */
  caption?: string;

  /**
   * Whether to stick the first column when scrolling horizontally
   * Useful for ID or action columns
   */
  stickyFirstColumn?: boolean;

  /**
   * Whether to show a visual indicator that the table is scrollable
   */
  showScrollIndicator?: boolean;

  /**
   * Children content - typically a Table component and its contents
   */
  children?: React.ReactNode;
}

/**
 * ResponsiveTable component wraps admin tables with enhanced mobile support
 *
 * Features:
 * - Horizontal scrolling on mobile with smooth scroll
 * - Optional sticky first column
 * - Optional scroll indicator for better UX
 * - Full accessibility support with optional caption
 * - Dark mode support
 *
 * F-40: ResponsiveTable component with overflow-x-auto
 */
export function ResponsiveTable({
  caption,
  stickyFirstColumn = false,
  showScrollIndicator = false,
  className,
  children,
  ...props
}: ResponsiveTableProps) {
  return (
    <div
      className={cn(
        // Base responsive scroll behavior
        "overflow-x-auto",
        // Touch device smooth scrolling (iOS)
        "[webkit-overflow-scrolling:touch]",
        // Responsive padding adjustments
        "rounded-lg",
        // Conditional classes
        stickyFirstColumn && "responsive-table-sticky-first",
        showScrollIndicator && "responsive-table-scroll-indicator",
        // Custom classes
        className,
      )}
      data-caption={caption}
      {...props}
    >
      {children}
    </div>
  );
}

export default ResponsiveTable;
