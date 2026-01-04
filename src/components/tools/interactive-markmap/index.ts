/**
 * Barrel export for Interactive MarkMap Renderer
 *
 * Provides backward compatibility for existing imports
 */

export { InteractiveMarkMapRenderer } from './interactive-markmap-renderer';
export type {
  InteractiveMarkMapRendererProps,
  InteractiveMarkMapHandle,
  MindmapNode,
} from './types';

// Export helpers for advanced usage
export { markdownToNodes, nodesToMarkdown, findNodeByLabel, cloneNodes } from './helpers';

// Export hooks for custom implementations
export {
  useMindmapState,
  useMindmapModifications,
  useMindmapView,
  useMarkmapRenderer,
} from './hooks';
