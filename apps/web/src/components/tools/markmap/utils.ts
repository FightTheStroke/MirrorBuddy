import type { MindmapNode } from './types';

// Convert structured nodes to markdown format
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

// Helper to create mindmap from topics (same interface as before)
export function createMindmapFromTopics(
  title: string,
  topics: Array<{ name: string; subtopics?: string[] }>
): { title: string; nodes: MindmapNode[] } {
  return {
    title,
    nodes: topics.map((topic, i) => ({
      id: `topic-${i}`,
      label: topic.name,
      children: topic.subtopics?.map((sub, j) => ({
        id: `topic-${i}-sub-${j}`,
        label: sub,
      })),
    })),
  };
}

// Helper to create mindmap from markdown
export function createMindmapFromMarkdown(
  title: string,
  markdown: string
): { title: string; markdown: string } {
  return { title, markdown };
}
