/**
 * Pure functions for mindmap node operations
 */

import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import type { MindmapNode } from '../types';
import { findNodeByLabel, cloneNodes } from '../helpers';
import { COLOR_MAP } from '../types';

export function addNodeToTree(
  nodes: MindmapNode[],
  concept: string,
  parentNodeLabel?: string
): MindmapNode[] {
  const newNode: MindmapNode = {
    id: nanoid(8),
    label: concept,
    children: [],
  };

  if (!parentNodeLabel) {
    logger.info('[InteractiveMarkmap] Added root node', { concept });
    return [...nodes, newNode];
  }

  const found = findNodeByLabel(nodes, parentNodeLabel);
  if (!found) {
    logger.warn('[InteractiveMarkmap] Parent not found, added to root', {
      concept,
      parentNodeLabel,
    });
    return [...nodes, newNode];
  }

  const newNodes = cloneNodes(nodes);
  const parentInClone = findNodeByLabel(newNodes, parentNodeLabel);
  if (parentInClone) {
    if (!parentInClone.node.children) parentInClone.node.children = [];
    parentInClone.node.children.push(newNode);
    logger.info('[InteractiveMarkmap] Added child node', {
      concept,
      parentNodeLabel,
    });
    return newNodes;
  }

  return nodes;
}

export function expandNodeInTree(
  nodes: MindmapNode[],
  nodeLabel: string,
  suggestions?: string[]
): MindmapNode[] | null {
  const found = findNodeByLabel(nodes, nodeLabel);
  if (!found) {
    logger.warn('[InteractiveMarkmap] Node not found for expand', { nodeLabel });
    return null;
  }

  const newNodes = cloneNodes(nodes);
  const nodeInClone = findNodeByLabel(newNodes, nodeLabel);
  if (!nodeInClone) return null;

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

  logger.info('[InteractiveMarkmap] Expanded node', {
    nodeLabel,
    childCount: childLabels.length,
  });
  return newNodes;
}

export function deleteNodeFromTree(
  nodes: MindmapNode[],
  nodeLabel: string
): MindmapNode[] | null {
  const found = findNodeByLabel(nodes, nodeLabel);
  if (!found) {
    logger.warn('[InteractiveMarkmap] Node not found for delete', { nodeLabel });
    return null;
  }

  const newNodes = cloneNodes(nodes);

  if (!found.parent) {
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

  logger.info('[InteractiveMarkmap] Deleted node', { nodeLabel });
  return newNodes;
}

export function setNodeColorInTree(
  nodes: MindmapNode[],
  nodeLabel: string,
  color: string
): MindmapNode[] | null {
  const found = findNodeByLabel(nodes, nodeLabel);
  if (!found) {
    logger.warn('[InteractiveMarkmap] Node not found for color', { nodeLabel });
    return null;
  }

  const resolvedColor = COLOR_MAP[color.toLowerCase()] || color;
  const newNodes = cloneNodes(nodes);
  const nodeInClone = findNodeByLabel(newNodes, nodeLabel);

  if (nodeInClone) {
    nodeInClone.node.color = resolvedColor;
    logger.info('[InteractiveMarkmap] Set node color', {
      nodeLabel,
      color: resolvedColor,
    });
    return newNodes;
  }

  return null;
}

export function connectNodesInTree(
  nodes: MindmapNode[],
  nodeALabel: string,
  nodeBLabel: string
): MindmapNode[] | null {
  const foundA = findNodeByLabel(nodes, nodeALabel);
  const foundB = findNodeByLabel(nodes, nodeBLabel);

  if (!foundA || !foundB) {
    logger.warn('[InteractiveMarkmap] Nodes not found for connect', {
      nodeALabel,
      nodeBLabel,
    });
    return null;
  }

  const newNodes = cloneNodes(nodes);
  const foundBInClone = findNodeByLabel(newNodes, nodeBLabel);
  if (!foundBInClone) return null;

  const nodeBCopy = cloneNodes([foundBInClone.node])[0];

  if (!foundBInClone.parent) {
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

  const foundAInClone = findNodeByLabel(newNodes, nodeALabel);
  if (foundAInClone) {
    if (!foundAInClone.node.children) foundAInClone.node.children = [];
    foundAInClone.node.children.push(nodeBCopy);
    logger.info('[InteractiveMarkmap] Connected nodes', {
      nodeALabel,
      nodeBLabel,
    });
    return newNodes;
  }

  return null;
}
