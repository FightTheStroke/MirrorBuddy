/**
 * Mindmap Content Parser
 * Extracts sections from mindmap data structures
 */

import type { ContentSection } from '../types';

/**
 * Extract sections from mindmap data
 */
export function extractMindmapSections(mindmap: Record<string, unknown>): ContentSection[] {
  const sections: ContentSection[] = [];

  sections.push({
    type: 'heading',
    content: 'Mappa Concettuale',
    level: 2,
  });

  // Extract nodes from mindmap structure
  if (mindmap.nodes && Array.isArray(mindmap.nodes)) {
    const nodes = mindmap.nodes as Array<{ label?: string; text?: string }>;
    const items = nodes
      .map((node) => node.label || node.text || '')
      .filter(Boolean);

    if (items.length > 0) {
      sections.push({
        type: 'list',
        content: 'Concetti principali:',
        items,
      });
    }
  }

  // Handle nested structure
  if (mindmap.central && typeof mindmap.central === 'object') {
    const central = mindmap.central as { text?: string; children?: Array<{ text?: string }> };
    sections.push({
      type: 'paragraph',
      content: `Tema centrale: ${central.text || 'Non specificato'}`,
    });

    if (central.children && Array.isArray(central.children)) {
      const items = central.children
        .map((child) => child.text || '')
        .filter(Boolean);

      if (items.length > 0) {
        sections.push({
          type: 'list',
          content: 'Argomenti correlati:',
          items,
        });
      }
    }
  }

  return sections;
}
