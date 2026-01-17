/**
 * Chart Renderer Types and Constants
 * Extracted to reduce main component file size and enable reuse
 */

import type { ChartRequest } from '@/types';

export interface ChartRendererProps {
  request: ChartRequest;
  className?: string;
}

export const defaultColors = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

// Common style configurations for chart components
export const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
};

export const legendStyle = { fontSize: '12px' };
