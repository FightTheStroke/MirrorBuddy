/**
 * Helper functions for mindmap import
 */

import type { MindmapNode } from '../mindmap-export';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `node_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Ensure all nodes have unique IDs
 */
export function ensureNodeIds(node: MindmapNode): void {
  if (!node.id) {
    node.id = generateId();
  }
  if (node.children) {
    node.children.forEach(ensureNodeIds);
  }
}
