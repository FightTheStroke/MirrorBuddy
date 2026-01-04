/**
 * Helper utilities for Interactive MarkMap Renderer
 *
 * Functions for markdown/node conversion, searching, and cloning
 */

import { nanoid } from 'nanoid';
import type { MindmapNode } from './types';

/**
 * Convert markdown to nodes (simplified parsing)
 */
export function markdownToNodes(markdown: string): MindmapNode[] {
  const lines = markdown.split('\n').filter((line) => line.trim());
  const root: MindmapNode[] = [];
  const stack: { node: MindmapNode; depth: number }[] = [];

  for (const line of lines) {
    const match = line.match(/^(#+)\s+(.+)$/);
    if (!match) continue;

    const depth = match[1].length;
    const label = match[2].trim();
    const node: MindmapNode = {
      id: nanoid(8),
      label,
      children: [],
    };

    if (depth === 1) {
      // This is the root title, skip
      continue;
    }

    // Find parent at depth - 1
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    }

    stack.push({ node, depth });
  }

  return root;
}

/**
 * Convert structured nodes to markdown format
 */
export function nodesToMarkdown(nodes: MindmapNode[], title: string): string {
  const buildMarkdown = (node: MindmapNode, depth: number): string => {
    const prefix = '#'.repeat(depth + 1);
    let result = `${prefix} ${node.label}\n`;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += buildMarkdown(child, depth + 1);
      }
    }

    return result;
  };

  let markdown = `# ${title}\n`;
  for (const node of nodes) {
    markdown += buildMarkdown(node, 1);
  }

  return markdown;
}

/**
 * Find a node by label (case-insensitive, partial match)
 */
export function findNodeByLabel(
  nodes: MindmapNode[],
  label: string
): { node: MindmapNode; parent: MindmapNode | null; index: number } | null {
  const normalizedLabel = label.toLowerCase().trim();

  const search = (
    nodeList: MindmapNode[],
    parent: MindmapNode | null
  ): { node: MindmapNode; parent: MindmapNode | null; index: number } | null => {
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      if (node.label.toLowerCase().includes(normalizedLabel)) {
        return { node, parent, index: i };
      }
      if (node.children && node.children.length > 0) {
        const found = search(node.children, node);
        if (found) return found;
      }
    }
    return null;
  };

  return search(nodes, null);
}

/**
 * Deep clone nodes
 */
export function cloneNodes(nodes: MindmapNode[]): MindmapNode[] {
  return JSON.parse(JSON.stringify(nodes));
}
