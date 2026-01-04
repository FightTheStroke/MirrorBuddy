/**
 * Modification methods hook for Interactive MarkMap
 *
 * Handles all node modification operations (add, expand, delete, focus, color, connect)
 */

import { useCallback, RefObject } from 'react';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type { MindmapNode } from '../types';
import { findNodeByLabel, cloneNodes } from '../helpers';
import { COLOR_MAP } from '../types';

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
      const newNode: MindmapNode = {
        id: nanoid(8),
        label: concept,
        children: [],
      };

      if (!parentNodeLabel) {
        // Add to root level
        updateNodes([...nodes, newNode]);
        logger.info('[InteractiveMarkmap] Added root node', { concept });
        return true;
      }

      // Find parent node
      const found = findNodeByLabel(nodes, parentNodeLabel);
      if (!found) {
        // If parent not found, add to root
        updateNodes([...nodes, newNode]);
        logger.warn('[InteractiveMarkmap] Parent not found, added to root', {
          concept,
          parentNodeLabel,
        });
        return true;
      }

      // Add to parent
      const newNodes = cloneNodes(nodes);
      const parentInClone = findNodeByLabel(newNodes, parentNodeLabel);
      if (parentInClone) {
        if (!parentInClone.node.children) parentInClone.node.children = [];
        parentInClone.node.children.push(newNode);
        updateNodes(newNodes);
        logger.info('[InteractiveMarkmap] Added child node', {
          concept,
          parentNodeLabel,
        });
        return true;
      }

      return false;
    },
    [nodes, updateNodes]
  );

  const expandNode = useCallback(
    (nodeLabel: string, suggestions?: string[]): boolean => {
      const found = findNodeByLabel(nodes, nodeLabel);
      if (!found) {
        logger.warn('[InteractiveMarkmap] Node not found for expand', {
          nodeLabel,
        });
        return false;
      }

      const newNodes = cloneNodes(nodes);
      const nodeInClone = findNodeByLabel(newNodes, nodeLabel);
      if (!nodeInClone) return false;

      // Add suggestions as children
      const childLabels = suggestions || [
        `${nodeLabel} - Dettaglio 1`,
        `${nodeLabel} - Dettaglio 2`,
        `${nodeLabel} - Dettaglio 3`,
      ];

      if (!nodeInClone.node.children) nodeInClone.node.children = [];
      for (const label of childLabels) {
        nodeInClone.node.children.push({
          id: nanoid(8),
          label,
          children: [],
        });
      }

      updateNodes(newNodes);
      logger.info('[InteractiveMarkmap] Expanded node', {
        nodeLabel,
        childCount: childLabels.length,
      });
      return true;
    },
    [nodes, updateNodes]
  );

  const deleteNode = useCallback(
    (nodeLabel: string): boolean => {
      const found = findNodeByLabel(nodes, nodeLabel);
      if (!found) {
        logger.warn('[InteractiveMarkmap] Node not found for delete', {
          nodeLabel,
        });
        return false;
      }

      const newNodes = cloneNodes(nodes);

      if (!found.parent) {
        // Root level node
        newNodes.splice(found.index, 1);
      } else {
        const parentInClone = findNodeByLabel(newNodes, found.parent.label);
        if (parentInClone && parentInClone.node.children) {
          const idx = parentInClone.node.children.findIndex(
            (c) => c.label.toLowerCase() === found.node.label.toLowerCase()
          );
          if (idx >= 0) {
            parentInClone.node.children.splice(idx, 1);
          }
        }
      }

      updateNodes(newNodes);
      logger.info('[InteractiveMarkmap] Deleted node', { nodeLabel });
      return true;
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
      const found = findNodeByLabel(nodes, nodeLabel);
      if (!found) {
        logger.warn('[InteractiveMarkmap] Node not found for color', {
          nodeLabel,
        });
        return false;
      }

      // Resolve color name to hex
      const resolvedColor = COLOR_MAP[color.toLowerCase()] || color;

      const newNodes = cloneNodes(nodes);
      const nodeInClone = findNodeByLabel(newNodes, nodeLabel);
      if (nodeInClone) {
        nodeInClone.node.color = resolvedColor;
        updateNodes(newNodes);
        logger.info('[InteractiveMarkmap] Set node color', {
          nodeLabel,
          color: resolvedColor,
        });
        return true;
      }

      return false;
    },
    [nodes, updateNodes]
  );

  const connectNodes = useCallback(
    (nodeALabel: string, nodeBLabel: string): boolean => {
      // In a tree structure, "connect" means move nodeB under nodeA
      const foundA = findNodeByLabel(nodes, nodeALabel);
      const foundB = findNodeByLabel(nodes, nodeBLabel);

      if (!foundA || !foundB) {
        logger.warn('[InteractiveMarkmap] Nodes not found for connect', {
          nodeALabel,
          nodeBLabel,
        });
        return false;
      }

      // Remove nodeB from its current position
      const newNodes = cloneNodes(nodes);

      // First, find and remove nodeB
      const foundBInClone = findNodeByLabel(newNodes, nodeBLabel);
      if (!foundBInClone) return false;

      const nodeBCopy = cloneNodes([foundBInClone.node])[0];

      if (!foundBInClone.parent) {
        // Remove from root
        const idx = newNodes.findIndex(
          (n) => n.label.toLowerCase() === nodeBLabel.toLowerCase()
        );
        if (idx >= 0) newNodes.splice(idx, 1);
      } else {
        const parent = findNodeByLabel(newNodes, foundBInClone.parent.label);
        if (parent && parent.node.children) {
          const idx = parent.node.children.findIndex(
            (c) => c.label.toLowerCase() === nodeBLabel.toLowerCase()
          );
          if (idx >= 0) parent.node.children.splice(idx, 1);
        }
      }

      // Now add nodeB under nodeA
      const foundAInClone = findNodeByLabel(newNodes, nodeALabel);
      if (foundAInClone) {
        if (!foundAInClone.node.children) foundAInClone.node.children = [];
        foundAInClone.node.children.push(nodeBCopy);
        updateNodes(newNodes);
        logger.info('[InteractiveMarkmap] Connected nodes', {
          nodeALabel,
          nodeBLabel,
        });
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
