/**
 * Mermaid diagram generator for SVG Overview Generator
 */

import type { OverviewData, OverviewNode } from './types';

/**
 * Generate Mermaid flowchart code from overview data
 * Used as fallback when SVG generation is not suitable
 */
export function generateMermaidCode(data: OverviewData): string {
  const lines: string[] = ['flowchart TD'];

  // Define styles
  lines.push('    classDef main fill:#3b82f6,stroke:#2563eb,color:#fff');
  lines.push('    classDef section fill:#8b5cf6,stroke:#7c3aed,color:#fff');
  lines.push('    classDef concept fill:#f0f9ff,stroke:#0ea5e9,color:#0c4a6e');
  lines.push('    classDef detail fill:#fafafa,stroke:#a3a3a3,color:#404040');

  // Build nodes and connections
  function processNode(node: OverviewNode, parentId?: string): void {
    const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
    const safeLabel = node.label.replace(/"/g, "'").substring(0, 30);

    lines.push(`    ${safeId}["${safeLabel}"]`);

    if (parentId) {
      lines.push(`    ${parentId} --> ${safeId}`);
    }

    lines.push(`    class ${safeId} ${node.type}`);

    if (node.children) {
      node.children.forEach((child) => processNode(child, safeId));
    }
  }

  processNode(data.root);

  return lines.join('\n');
}
