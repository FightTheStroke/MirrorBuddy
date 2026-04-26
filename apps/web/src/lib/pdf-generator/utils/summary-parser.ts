/**
 * Summary Content Parser
 * Extracts sections from summary text with markdown-like parsing
 */

import type { ContentSection } from '../types';

/**
 * Extract sections from summary text
 */
export function extractSummarySections(summary: string): ContentSection[] {
  const sections: ContentSection[] = [];

  // Add summary heading
  sections.push({
    type: 'heading',
    content: 'Riassunto',
    level: 2,
  });

  // Parse markdown-like content
  const lines = summary.split('\n');
  let currentParagraph = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for headings
    if (trimmed.startsWith('###')) {
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      sections.push({
        type: 'heading',
        content: trimmed.replace(/^#+\s*/, ''),
        level: 3,
      });
    } else if (trimmed.startsWith('##')) {
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      sections.push({
        type: 'heading',
        content: trimmed.replace(/^#+\s*/, ''),
        level: 2,
      });
    } else if (trimmed.startsWith('#')) {
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      sections.push({
        type: 'heading',
        content: trimmed.replace(/^#+\s*/, ''),
        level: 1,
      });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // List item
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      // Collect consecutive list items
      const listItems: string[] = [trimmed.replace(/^[-*]\s*/, '')];
      sections.push({ type: 'list', content: '', items: listItems });
    } else if (trimmed.startsWith('>')) {
      // Quote
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      sections.push({
        type: 'quote',
        content: trimmed.replace(/^>\s*/, ''),
      });
    } else if (trimmed) {
      // Regular paragraph text
      currentParagraph += ' ' + trimmed;
    } else if (currentParagraph) {
      // Empty line - end of paragraph
      sections.push({ type: 'paragraph', content: currentParagraph.trim() });
      currentParagraph = '';
    }
  }

  // Add remaining paragraph
  if (currentParagraph.trim()) {
    sections.push({ type: 'paragraph', content: currentParagraph.trim() });
  }

  return sections;
}
