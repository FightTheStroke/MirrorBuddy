'use client';

/**
 * LiveMindmap Component
 *
 * Combines InteractiveMarkMapRenderer with SSE event listening for real-time
 * voice command modifications. This is the primary mindmap component for
 * conversation-first tool building.
 *
 * Part of Phase 7: Voice Commands for Mindmaps
 */

import { useRef, useCallback } from 'react';
import {
  InteractiveMarkMapRenderer,
  type InteractiveMarkMapHandle,
  type InteractiveMarkMapRendererProps,
} from './interactive-markmap';
import {
  useMindmapModifications,
  type MindmapModificationCallbacks,
} from '@/lib/hooks/use-mindmap-modifications';
import { logger } from '@/lib/logger';
import type { MindmapNode } from './markmap';

// ============================================================================
// TYPES
// ============================================================================

export interface LiveMindmapProps extends Omit<InteractiveMarkMapRendererProps, 'ref'> {
  /** Session ID for SSE subscription */
  sessionId: string | null;
  /** Whether to listen for SSE events (default: true when sessionId provided) */
  listenForEvents?: boolean;
  /** Callback when nodes change (for persisting) */
  onNodesChange?: (nodes: MindmapNode[]) => void;
  /** Callback when a modification is received */
  onModification?: (command: string, args: Record<string, unknown>) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LiveMindmap({
  sessionId,
  listenForEvents = true,
  onNodesChange,
  onModification,
  ...rendererProps
}: LiveMindmapProps) {
  const rendererRef = useRef<InteractiveMarkMapHandle>(null);

  // Define modification callbacks
  const callbacks: MindmapModificationCallbacks = {
    onAddNode: useCallback(
      (concept: string, parentNode?: string) => {
        if (rendererRef.current) {
          rendererRef.current.addNode(concept, parentNode);
          onModification?.('mindmap_add_node', { concept, parentNode });
        }
      },
      [onModification]
    ),

    onConnectNodes: useCallback(
      (nodeA: string, nodeB: string) => {
        if (rendererRef.current) {
          rendererRef.current.connectNodes(nodeA, nodeB);
          onModification?.('mindmap_connect_nodes', { nodeA, nodeB });
        }
      },
      [onModification]
    ),

    onExpandNode: useCallback(
      (node: string, suggestions?: string[]) => {
        if (rendererRef.current) {
          rendererRef.current.expandNode(node, suggestions);
          onModification?.('mindmap_expand_node', { node, suggestions });
        }
      },
      [onModification]
    ),

    onDeleteNode: useCallback(
      (node: string) => {
        if (rendererRef.current) {
          rendererRef.current.deleteNode(node);
          onModification?.('mindmap_delete_node', { node });
        }
      },
      [onModification]
    ),

    onFocusNode: useCallback(
      (node: string) => {
        if (rendererRef.current) {
          rendererRef.current.focusNode(node);
          onModification?.('mindmap_focus_node', { node });
        }
      },
      [onModification]
    ),

    onSetColor: useCallback(
      (node: string, color: string) => {
        if (rendererRef.current) {
          rendererRef.current.setNodeColor(node, color);
          onModification?.('mindmap_set_color', { node, color });
        }
      },
      [onModification]
    ),
  };

  // Subscribe to SSE modifications
  const { isConnected } = useMindmapModifications({
    sessionId,
    enabled: listenForEvents && !!sessionId,
    callbacks,
  });

  // Handle nodes change from renderer
  const handleNodesChange = useCallback(
    (nodes: MindmapNode[]) => {
      onNodesChange?.(nodes);
    },
    [onNodesChange]
  );

  logger.debug('[LiveMindmap] Render', {
    sessionId,
    listenForEvents,
    isConnected,
  });

  return (
    <InteractiveMarkMapRenderer
      ref={rendererRef}
      {...rendererProps}
      onNodesChange={handleNodesChange}
    />
  );
}

// Re-export types for convenience
export type { MindmapNode, InteractiveMarkMapHandle };
