/**
 * Knowledge Hub Renderer Registry
 *
 * Provides a unified interface for rendering different material types.
 * Each material type has a dedicated renderer component.
 *
 * Usage:
 *   const Renderer = getRenderer('mindmap');
 *   <Renderer data={materialContent} />
 *
 * Part of Phase 5: Knowledge Hub Components (ADR 0022)
 */

import type { ToolType } from "@/types/tools";
import type { BaseRendererProps, RendererComponent } from "./types";

// Re-export types from types.ts to maintain API compatibility
export type { BaseRendererProps, RendererComponent } from "./types";

// Re-export existing renderers (non-heavy ones only)
// NOTE: ChartRenderer and DiagramRenderer are lazy-loaded via getRendererImport()
// to avoid bundling recharts (~200KB) and mermaid (~300KB) in main chunk
export { SummaryRenderer } from "@/components/tools/summary-renderer";
export { FormulaRenderer } from "@/components/tools/formula-renderer";
export { MarkMapRenderer } from "@/components/tools/markmap";

// Re-export validation utilities
export {
  validateRendererData,
  getValidator,
  isValidMindmapData,
  isValidQuizData,
  isValidFlashcardData,
  isValidSummaryData,
  isValidChartData,
  isValidDiagramData,
  isValidTimelineData,
  isValidFormulaData,
  isValidHomeworkData,
  isValidDemoData,
  isValidImageData,
  isValidPdfData,
} from "./validation";

// Re-export error boundary
export {
  RendererErrorBoundary,
  withErrorBoundary,
} from "./renderer-error-boundary";

// Lazy import wrappers to avoid circular dependencies and enable code splitting
const rendererImports: Partial<
  Record<ToolType, () => Promise<{ default: RendererComponent }>>
> = {
  mindmap: () =>
    import("./mindmap-renderer").then((m) => ({ default: m.MindmapRenderer })),
  quiz: () =>
    import("./quiz-renderer").then((m) => ({ default: m.QuizRenderer })),
  flashcard: () =>
    import("./flashcard-renderer").then((m) => ({
      default: m.FlashcardRenderer,
    })),
  summary: () =>
    import("./summary-renderer").then((m) => ({ default: m.SummaryRenderer })),
  demo: () =>
    import("./demo-renderer").then((m) => ({ default: m.DemoRenderer })),
  diagram: () =>
    import("./diagram-renderer").then((m) => ({ default: m.DiagramRenderer })),
  timeline: () =>
    import("./timeline-renderer").then((m) => ({
      default: m.TimelineRenderer,
    })),
  formula: () =>
    import("./formula-renderer").then((m) => ({ default: m.FormulaRenderer })),
  chart: () =>
    import("./chart-renderer").then((m) => ({ default: m.ChartRenderer })),
  pdf: () => import("./pdf-renderer").then((m) => ({ default: m.PdfRenderer })),
  webcam: () =>
    import("./image-renderer").then((m) => ({ default: m.ImageRenderer })),
  homework: () =>
    import("./homework-renderer").then((m) => ({
      default: m.HomeworkRenderer,
    })),
};

// Fallback renderer for unknown types
export function FallbackRenderer({ data, className }: BaseRendererProps) {
  return (
    <div className={className}>
      <pre className="p-4 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg overflow-auto max-h-96">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Get the lazy import function for a renderer
 *
 * @param toolType - The type of tool/material
 * @returns A function that returns a promise resolving to the renderer component
 */
export function getRendererImport(
  toolType: ToolType,
): (() => Promise<{ default: RendererComponent }>) | null {
  return rendererImports[toolType] || null;
}

/**
 * Check if a renderer exists for the given tool type.
 * Returns false for types like 'search' that don't have visual renderers.
 *
 * @param toolType - The tool type to check
 * @returns True if a renderer exists for this type
 */
export function hasRenderer(toolType: ToolType): boolean {
  return toolType in rendererImports;
}

/**
 * Get list of all tool types that have renderers.
 * Useful for dynamically building UI that shows available material types.
 *
 * @returns Array of ToolType values that have associated renderers
 */
export function getSupportedRenderers(): ToolType[] {
  return Object.keys(rendererImports) as ToolType[];
}

// Map of tool types to their display labels (Italian)
export const RENDERER_LABELS: Record<ToolType, string> = {
  mindmap: "Mappa Mentale",
  quiz: "Quiz",
  flashcard: "Flashcard",
  summary: "Riassunto",
  demo: "Demo Interattiva",
  diagram: "Diagramma",
  timeline: "Linea del Tempo",
  formula: "Formula",
  calculator: "Calcolatrice",
  chart: "Grafico",
  pdf: "PDF",
  webcam: "Immagine",
  "webcam-standalone": "Immagine Standalone",
  homework: "Compiti",
  search: "Ricerca",
  typing: "Impara a Digitare",
  "study-kit": "Study Kit",
};

// Map of tool types to their icons (Lucide icon names)
export const RENDERER_ICONS: Record<ToolType, string> = {
  mindmap: "brain",
  quiz: "help-circle",
  flashcard: "layers",
  summary: "file-text",
  demo: "play-circle",
  diagram: "git-branch",
  timeline: "clock",
  formula: "function-square",
  calculator: "calculator",
  chart: "bar-chart-2",
  pdf: "file",
  webcam: "image",
  "webcam-standalone": "image",
  homework: "book-open",
  search: "search",
  typing: "keyboard",
  "study-kit": "book-open",
};
