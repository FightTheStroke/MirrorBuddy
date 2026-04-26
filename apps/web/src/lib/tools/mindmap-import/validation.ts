/**
 * Validation for imported mindmaps
 */

import type { MindmapData, MindmapNode } from '../mindmap-export';

/**
 * Validate imported mindmap structure
 */
export function validateMindmap(mindmap: MindmapData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!mindmap.title) {
    errors.push('Missing title');
  }

  if (!mindmap.root) {
    errors.push('Missing root node');
  } else {
    if (!mindmap.root.text) {
      errors.push('Root node missing text');
    }
    validateNodeRecursive(mindmap.root, errors, 'root');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Recursively validate node structure
 */
function validateNodeRecursive(
  node: MindmapNode,
  errors: string[],
  path: string
): void {
  if (!node.id) {
    errors.push(`Node at ${path} missing id`);
  }
  if (!node.text) {
    errors.push(`Node at ${path} missing text`);
  }
  if (node.children) {
    node.children.forEach((child, i) => {
      validateNodeRecursive(child, errors, `${path}.children[${i}]`);
    });
  }
}
