/**
 * Mindmap Data Structure Utilities
 *
 * Converts between flat parentId format (storage) and
 * nested children format (rendering).
 *
 * ADR: 0020-mindmap-data-structure-fix.md
 */

export interface FlatNode {
  id: string;
  label: string;
  parentId?: string | null;
  color?: string;
  icon?: string;
}

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  color?: string;
  icon?: string;
}

/**
 * Convert flat parentId nodes to nested children tree.
 * Used when rendering mindmaps that were stored with parentId format.
 */
export function convertParentIdToChildren(nodes: FlatNode[]): TreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  // Build lookup map
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // First pass: create all TreeNodes without children
  for (const node of nodes) {
    nodeMap.set(node.id, {
      id: node.id,
      label: node.label,
      color: node.color,
      icon: node.icon,
      children: [],
    });
  }

  // Second pass: link children to parents
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;

    if (!node.parentId || node.parentId === 'null' || node.parentId === '') {
      // Root node
      rootNodes.push(treeNode);
    } else {
      // Find parent and add as child
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(treeNode);
      } else {
        // Parent not found, treat as root
        rootNodes.push(treeNode);
      }
    }
  }

  // Clean up empty children arrays
  const cleanChildren = (node: TreeNode): TreeNode => {
    if (node.children && node.children.length === 0) {
      delete node.children;
    } else if (node.children) {
      node.children = node.children.map(cleanChildren);
    }
    return node;
  };

  return rootNodes.map(cleanChildren);
}

/**
 * Convert nested children tree to flat parentId format.
 * Used when saving mindmaps to database.
 */
export function convertChildrenToParentId(
  nodes: TreeNode[],
  parentId: string | null = null
): FlatNode[] {
  const result: FlatNode[] = [];

  for (const node of nodes) {
    result.push({
      id: node.id,
      label: node.label,
      parentId,
      color: node.color,
      icon: node.icon,
    });

    if (node.children && node.children.length > 0) {
      result.push(...convertChildrenToParentId(node.children, node.id));
    }
  }

  return result;
}

/**
 * Generate markdown from flat parentId nodes.
 * Uses proper heading levels for hierarchy.
 */
export function generateMarkdownFromFlatNodes(
  title: string,
  nodes: FlatNode[]
): string {
  const tree = convertParentIdToChildren(nodes);
  return generateMarkdownFromTree(title, tree);
}

/**
 * Generate markdown from nested tree structure.
 */
export function generateMarkdownFromTree(
  title: string,
  nodes: TreeNode[]
): string {
  let markdown = `# ${title}\n\n`;

  const buildLevel = (node: TreeNode, depth: number): string => {
    const prefix = '#'.repeat(Math.min(depth + 1, 6)); // Max h6
    let result = `${prefix} ${node.label}\n`;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += buildLevel(child, depth + 1);
      }
    }

    return result;
  };

  for (const node of nodes) {
    markdown += buildLevel(node, 1);
  }

  return markdown;
}

/**
 * Detect if nodes are in parentId or children format.
 */
export function detectNodeFormat(
  nodes: unknown[]
): 'parentId' | 'children' | 'unknown' {
  if (!nodes || nodes.length === 0) return 'unknown';

  const first = nodes[0] as Record<string, unknown>;

  if ('parentId' in first) return 'parentId';
  if ('children' in first) return 'children';

  return 'unknown';
}
