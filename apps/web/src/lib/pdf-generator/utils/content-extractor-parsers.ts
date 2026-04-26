/**
 * Content Extractor Parsers
 * Parsing functions for different content types
 */

import type { ContentSection, ContentImage } from '../types';

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

/**
 * Extract sections from mindmap data
 */
export function extractMindmapSections(
  mindmap: Record<string, unknown>
): ContentSection[] {
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
    const central = mindmap.central as {
      text?: string;
      children?: Array<{ text?: string }>;
    };
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

/**
 * Extract sections from quiz data
 */
export function extractQuizSections(
  quiz: Record<string, unknown>
): ContentSection[] {
  const sections: ContentSection[] = [];

  sections.push({
    type: 'heading',
    content: 'Quiz di Verifica',
    level: 2,
  });

  const questions = quiz.questions as
    | Array<{
        question: string;
        options?: string[];
        explanation?: string;
      }>
    | undefined;

  if (questions && Array.isArray(questions)) {
    questions.forEach((q, index) => {
      sections.push({
        type: 'paragraph',
        content: `Domanda ${index + 1}: ${q.question}`,
      });

      if (q.options && Array.isArray(q.options)) {
        sections.push({
          type: 'list',
          content: 'Opzioni:',
          items: q.options,
        });
      }

      if (q.explanation) {
        sections.push({
          type: 'quote',
          content: `Spiegazione: ${q.explanation}`,
        });
      }
    });
  }

  return sections;
}

/**
 * Extract images from material
 */
export function extractMaterialImages(material: unknown): ContentImage[] {
  const images: ContentImage[] = [];

  if (!material || typeof material !== 'object') {
    return images;
  }

  const mat = material as Record<string, unknown>;

  // Check for images array
  if (mat.images && Array.isArray(mat.images)) {
    for (const img of mat.images) {
      if (typeof img === 'object' && img !== null) {
        const imgObj = img as {
          src?: string;
          url?: string;
          alt?: string;
          caption?: string;
        };
        images.push({
          src: imgObj.src || imgObj.url || '',
          alt: imgObj.alt || 'Image',
          caption: imgObj.caption,
        });
      }
    }
  }

  return images;
}

/**
 * Calculate total word count from sections
 */
export function calculateWordCount(sections: ContentSection[]): number {
  let count = 0;

  for (const section of sections) {
    // Count words in main content
    if (section.content) {
      count += section.content.split(/\s+/).filter(Boolean).length;
    }

    // Count words in list items
    if (section.items) {
      for (const item of section.items) {
        count += item.split(/\s+/).filter(Boolean).length;
      }
    }
  }

  return count;
}

/**
 * Estimate reading time based on profile
 * Different profiles may have different reading speeds
 */
export function estimateReadingTime(wordCount: number, profile: string): number {
  // Words per minute by profile (adjusted for accessibility needs)
  const wpmByProfile: Record<string, number> = {
    dyslexia: 120, // Slower due to processing difficulties
    dyscalculia: 180, // Normal for text, focus on numbers
    dysgraphia: 180, // Normal reading speed
    dysorthography: 150, // Slower due to spelling focus
    adhd: 150, // Slower due to attention management
    dyspraxia: 140, // Slower due to tracking difficulties
    stuttering: 100, // Slower for reading aloud
  };

  const wpm = wpmByProfile[profile] || 180;
  return Math.ceil(wordCount / wpm);
}
