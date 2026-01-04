'use client';

/**
 * Knowledge Hub Mindmap Renderer
 *
 * Wrapper around the main MarkMapRenderer for use in Knowledge Hub.
 * Adapts BaseRendererProps to MarkMapRendererProps.
 *
 * Expected data format:
 * {
 *   title: string;
 *   markdown?: string;
 *   nodes?: MindmapNode[];
 * }
 */

import { MarkMapRenderer, type MindmapNode } from '@/components/tools/markmap';
import type { BaseRendererProps } from './index';

interface MindmapData {
  title?: string;
  markdown?: string;
  nodes?: MindmapNode[];
}

/**
 * Render a mindmap from stored material data.
 *
 * @param data - Material content containing title, markdown, or nodes
 * @param className - Additional CSS classes
 * @param readOnly - Whether the renderer is in read-only mode (unused for mindmaps)
 */
export function MindmapRenderer({ data, className }: BaseRendererProps) {
  const mindmapData = data as MindmapData;

  const title = mindmapData.title || 'Mappa Mentale';
  const markdown = mindmapData.markdown;
  const nodes = mindmapData.nodes;

  return (
    <MarkMapRenderer
      title={title}
      markdown={markdown}
      nodes={nodes}
      className={className}
    />
  );
}
