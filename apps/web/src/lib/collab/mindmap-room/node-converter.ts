import type { MindmapNode as ExportNode } from "@/lib/tools/mindmap-export/index";
import type { MindmapNode as ToolNode } from "@/types/tools";

/**
 * Convert MindmapNode from export format (text) to tool format (label)
 */
export function convertExportNodeToToolNode(node: ExportNode): ToolNode {
  const result: ToolNode = {
    id: node.id,
    label: node.text,
  };

  if (node.children) {
    result.children = node.children.map(convertExportNodeToToolNode);
  }

  return result;
}

/**
 * Convert MindmapNode from tool format (label) to export format (text)
 */
export function convertToolNodeToExportNode(node: ToolNode): ExportNode {
  const result: ExportNode = {
    id: node.id,
    text: node.label,
  };

  if (node.children) {
    result.children = node.children.map(convertToolNodeToExportNode);
  }

  return result;
}
