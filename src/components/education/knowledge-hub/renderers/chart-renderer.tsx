'use client';

/**
 * Knowledge Hub Chart Renderer
 *
 * Wrapper around the main ChartRenderer for use in Knowledge Hub.
 * Adapts BaseRendererProps to ChartRendererProps.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
 *   data: { labels: string[]; datasets: ChartDataset[]; }
 * }
 */

import { ChartRenderer as BaseChartRenderer } from '@/components/tools/chart-renderer';
import type { ChartRequest } from '@/types';
import type { BaseRendererProps } from './index';

/**
 * Render a chart from stored material data.
 */
export function ChartRenderer({ data, className }: BaseRendererProps) {
  const chartData = data as unknown as Partial<ChartRequest> & { title?: string };

  // Build the request object for the base renderer
  const request: ChartRequest = {
    type: chartData.type || 'bar',
    title: chartData.title || 'Grafico',
    data: chartData.data || { labels: [], datasets: [] },
  };

  return <BaseChartRenderer request={request} className={className} />;
}
