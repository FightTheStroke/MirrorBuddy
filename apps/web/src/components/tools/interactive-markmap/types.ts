/**
 * Type definitions for Interactive MarkMap Renderer
 *
 * Part of Phase 7: Voice Commands for Mindmaps
 */

import type { MindmapNode } from '../markmap';

// Color name to hex mapping for Italian color commands
export const COLOR_MAP: Record<string, string> = {
  rosso: '#ef4444',
  red: '#ef4444',
  blu: '#3b82f6',
  blue: '#3b82f6',
  verde: '#10b981',
  green: '#10b981',
  giallo: '#facc15',
  yellow: '#facc15',
  arancione: '#f97316',
  orange: '#f97316',
  viola: '#8b5cf6',
  purple: '#8b5cf6',
  rosa: '#ec4899',
  pink: '#ec4899',
};

// Props for the interactive renderer
export interface InteractiveMarkMapRendererProps {
  title: string;
  initialMarkdown?: string;
  initialNodes?: MindmapNode[];
  className?: string;
  onNodesChange?: (nodes: MindmapNode[]) => void;
}

// Imperative handle exposed by the component
export interface InteractiveMarkMapHandle {
  // Modification methods
  addNode: (concept: string, parentNodeLabel?: string) => boolean;
  expandNode: (nodeLabel: string, suggestions?: string[]) => boolean;
  deleteNode: (nodeLabel: string) => boolean;
  focusNode: (nodeLabel: string) => boolean;
  setNodeColor: (nodeLabel: string, color: string) => boolean;
  connectNodes: (nodeALabel: string, nodeBLabel: string) => boolean;

  // View methods
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  toggleFullscreen: () => Promise<void>;

  // State methods
  getNodes: () => MindmapNode[];
  setNodes: (nodes: MindmapNode[]) => void;
  undo: () => boolean;
}

// Export MindmapNode type for convenience
export type { MindmapNode };
