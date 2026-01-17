"use client";

/**
 * Knowledge Hub Diagram Renderer
 *
 * Wrapper around the main DiagramRenderer for use in Knowledge Hub.
 * Adapts BaseRendererProps to DiagramRendererProps.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   code: string;  // Mermaid syntax
 *   type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er';
 * }
 */

import { DiagramRenderer as BaseDiagramRenderer } from "@/components/tools/diagram-renderer";
import type { DiagramRequest } from "@/types";
import type { BaseRendererProps } from "./types";

/**
 * Render a Mermaid diagram from stored material data.
 */
export function DiagramRenderer({ data, className }: BaseRendererProps) {
  const diagramData = data as unknown as Partial<DiagramRequest> & {
    title?: string;
  };

  // Build the request object for the base renderer
  const request: DiagramRequest = {
    type: diagramData.type || "flowchart",
    code: diagramData.code || "",
    title: diagramData.title,
  };

  return <BaseDiagramRenderer request={request} className={className} />;
}
