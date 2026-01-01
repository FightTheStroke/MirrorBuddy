// ============================================================================
// MINDMAP HANDLER
// Creates mind maps using MarkMap format
// ============================================================================

import { registerToolHandler } from '../tool-executor';
import { nanoid } from 'nanoid';
import type { MindmapData, MindmapNode, ToolExecutionResult } from '@/types/tools';

/**
 * Generate markdown content from tree nodes
 * MarkMap expects markdown headers for hierarchy
 */
function generateMarkdownFromNodes(
  topic: string,
  nodes: MindmapNode[]
): string {
  // Build a map of nodes by ID
  const nodeMap = new Map<string, MindmapNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Find root nodes (no parentId or parentId is null)
  const rootNodes = nodes.filter(
    (n) => !n.parentId || n.parentId === 'null' || n.parentId === ''
  );

  // Build markdown recursively
  let markdown = `# ${topic}\n\n`;

  function buildLevel(parentId: string | null, level: number): string {
    const children = nodes.filter(
      (n) =>
        (parentId === null &&
          (!n.parentId || n.parentId === 'null' || n.parentId === '')) ||
        n.parentId === parentId
    );

    let result = '';
    for (const child of children) {
      const prefix = '#'.repeat(Math.min(level + 1, 6)); // Max h6
      result += `${prefix} ${child.label}\n\n`;
      result += buildLevel(child.id, level + 1);
    }
    return result;
  }

  // Start from root level (after main topic)
  for (const root of rootNodes) {
    markdown += `## ${root.label}\n\n`;
    markdown += buildLevel(root.id, 2);
  }

  return markdown;
}

/**
 * Register the mindmap handler
 */
registerToolHandler('create_mindmap', async (args): Promise<ToolExecutionResult> => {
  const { title, nodes } = args as {
    title: string;
    nodes: Array<{ id: string; label: string; parentId?: string }>;
  };

  // Validate input
  if (!title || typeof title !== 'string') {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'mindmap',
      error: 'Title is required and must be a string',
    };
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      success: false,
      toolId: nanoid(),
      toolType: 'mindmap',
      error: 'Nodes array is required and must not be empty',
    };
  }

  // Generate markdown content
  const markdown = generateMarkdownFromNodes(title, nodes);

  const data: MindmapData = {
    topic: title, // MindmapData uses 'topic' internally
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      parentId: n.parentId || null,
    })),
    markdown,
  };

  return {
    success: true,
    toolId: nanoid(),
    toolType: 'mindmap',
    data,
  };
});

export { generateMarkdownFromNodes };
