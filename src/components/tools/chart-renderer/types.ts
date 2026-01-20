/**
 * Chart Renderer Types and Constants
 * Extracted to reduce main component file size and enable reuse
 */

import type { ChartRequest } from "@/types";

export interface ChartRendererProps {
  request: ChartRequest;
  className?: string;
}

export const defaultColors = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

// Common style configurations for chart components
// Dynamic tooltip style based on theme
export const getTooltipStyle = (isDark: boolean) => ({
  backgroundColor: isDark ? "#1e293b" : "#ffffff",
  border: isDark ? "none" : "1px solid #e2e8f0",
  borderRadius: "8px",
  color: isDark ? "#fff" : "#1e293b",
});

// For backwards compatibility - defaults to dark
export const tooltipStyle = getTooltipStyle(true);

// Dynamic colors for chart grid and axes
export const getGridColor = (isDark: boolean) =>
  isDark ? "#334155" : "#e5e7eb";
export const getAxisColor = (isDark: boolean) =>
  isDark ? "#94a3b8" : "#64748b";

export const legendStyle = { fontSize: "12px" };
