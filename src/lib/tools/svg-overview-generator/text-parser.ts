/**
 * Text parsing functions for SVG Overview Generator
 */

import type { OverviewData, OverviewNode } from './types';

/**
 * Parse summary text into overview structure
 * Extracts main topics and concepts from text
 */
export function parseTextToOverview(title: string, text: string, subject?: string): OverviewData {
  const lines = text.split('\n').filter((line) => line.trim());
  const root: OverviewNode = {
    id: 'root',
    label: title,
    type: 'main',
    children: [],
  };

  let currentSection: OverviewNode | null = null;
  let idCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect headers (## or ###)
    if (trimmed.startsWith('## ')) {
      currentSection = {
        id: `section_${++idCounter}`,
        label: trimmed.replace('## ', ''),
        type: 'section',
        children: [],
      };
      root.children?.push(currentSection);
    } else if (trimmed.startsWith('### ')) {
      const concept: OverviewNode = {
        id: `concept_${++idCounter}`,
        label: trimmed.replace('### ', ''),
        type: 'concept',
        children: [],
      };
      if (currentSection) {
        currentSection.children?.push(concept);
      } else {
        root.children?.push(concept);
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const detail: OverviewNode = {
        id: `detail_${++idCounter}`,
        label: trimmed.replace(/^[-*]\s+/, ''),
        type: 'detail',
      };
      if (currentSection?.children && currentSection.children.length > 0) {
        const lastChild = currentSection.children[currentSection.children.length - 1];
        if (!lastChild.children) lastChild.children = [];
        lastChild.children.push(detail);
      } else if (currentSection) {
        currentSection.children?.push(detail);
      }
    }
  }

  // If no structure found, create simple structure from paragraphs
  if (!root.children?.length) {
    const paragraphs = text.split('\n\n').filter((p) => p.trim());
    paragraphs.slice(0, 5).forEach((p, i) => {
      root.children?.push({
        id: `para_${i}`,
        label: p.substring(0, 50) + (p.length > 50 ? '...' : ''),
        type: 'concept',
      });
    });
  }

  return { title, subject, root };
}
