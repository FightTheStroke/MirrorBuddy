'use client';

/**
 * Knowledge Hub Summary Renderer
 *
 * Wrapper around the main SummaryRenderer for use in Knowledge Hub.
 * Adapts BaseRendererProps to SummaryRendererProps.
 *
 * Expected data format:
 * {
 *   title: string;
 *   sections: SummarySection[];
 *   length?: 'short' | 'medium' | 'long';
 * }
 */

import { SummaryRenderer as BaseSummaryRenderer } from '@/components/tools/summary-renderer';
import type { SummarySection } from '@/types/tools';
import type { BaseRendererProps } from './index';

interface SummaryData {
  title?: string;
  sections: SummarySection[];
  length?: 'short' | 'medium' | 'long';
}

/**
 * Render a summary from stored material data.
 */
export function SummaryRenderer({ data, className }: BaseRendererProps) {
  const summaryData = data as unknown as SummaryData;

  const title = summaryData.title || 'Riassunto';
  const sections = summaryData.sections || [];

  return (
    <BaseSummaryRenderer
      title={title}
      sections={sections}
      length={summaryData.length}
      expandAll={true}
      className={className}
    />
  );
}
