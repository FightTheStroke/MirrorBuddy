/**
 * Modification methods hook for Interactive MarkMap
 *
 * Handles all node modification operations (add, expand, delete, focus, color, connect)
 */

import { useCallback, RefObject } from 'react';
import { logger } from '@/lib/logger';
import type { MindmapNode } from '../types';
import {
  addNodeToTree,
  expandNodeInTree,
  deleteNodeFromTree,
  setNodeColorInTree,
  connectNodesInTree,
} from './mindmap-operations';

export interface UseMindmapModificationsProps {
  nodes: MindmapNode[];
  updateNodes: (nodes: MindmapNode[]) => void;
  svgRef: RefObject<SVGSVGElement | null>;
}

export function useMindmapModifications({
  nodes,
  updateNodes,
  svgRef,
}: UseMindmapModificationsProps) {
  const addNode = useCallback(
    (concept: string, parentNodeLabel?: string): boolean => {
      const newNodes = addNodeToTree(nodes, concept, parentNodeLabel);
      if (newNodes) {
        updateNodes(newNodes);
        return true;
      }
      return false;
    },
    [nodes, updateNodes]
  );

  const expandNode = useCallback(
    (nodeLabel: string, suggestions?: string[]): boolean => {
      const newNodes = expandNodeInTree(nodes, nodeLabel, suggestions);
      if (newNodes) {
        updateNodes(newNodes);
        return true;
      }
      return false;
    },
    [nodes, updateNodes]
  );

  const deleteNode = useCallback(
    (nodeLabel: string): boolean => {
      const newNodes = deleteNodeFromTree(nodes, nodeLabel);
      if (newNodes) {
        updateNodes(newNodes);
        return true;
      }
      return false;
    },
    [nodes, updateNodes]
  );

  const focusNode = useCallback(
    (nodeLabel: string): boolean => {
      if (!svgRef.current) return false;

      // Find the node in the SVG
      const textElements = svgRef.current.querySelectorAll('text, foreignObject');
      const normalizedLabel = nodeLabel.toLowerCase().trim();

      for (const el of textElements) {
        const text = el.textContent?.toLowerCase().trim();
        if (text && text.includes(normalizedLabel)) {
          // Get the g element that contains this node
          let parent = el.parentElement;
          while (parent && parent.tagName !== 'g') {
            parent = parent.parentElement;
          }

          if (parent) {
            // Scroll into view
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Flash highlight
            const svgParent = parent as unknown as SVGElement;
            const originalFill = svgParent.style.fill;
            svgParent.style.fill = '#facc15';
            setTimeout(() => {
              svgParent.style.fill = originalFill;
            }, 1000);

            logger.info('[InteractiveMarkmap] Focused on node', { nodeLabel });
            return true;
          }
        }
      }

      logger.warn('[InteractiveMarkmap] Node not found for focus', { nodeLabel });
      return false;
    },
    [svgRef]
  );

  const setNodeColor = useCallback(
    (nodeLabel: string, color: string): boolean => {
      const newNodes = setNodeColorInTree(nodes, nodeLabel, color);
      if (newNodes) {
        updateNodes(newNodes);
        return true;
      }
      return false;
    },
    [nodes, updateNodes]
  );

  const connectNodes = useCallback(
    (nodeALabel: string, nodeBLabel: string): boolean => {
      const newNodes = connectNodesInTree(nodes, nodeALabel, nodeBLabel);
      if (newNodes) {
        updateNodes(newNodes);
        return true;
      }
      return false;
    },
    [nodes, updateNodes]
  );

  return {
    addNode,
    expandNode,
    deleteNode,
    focusNode,
    setNodeColor,
    connectNodes,
  };
}
