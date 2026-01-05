/**
 * Content Extractor
 * Extracts content from Study Kit materials for PDF generation
 */

import type { ExtractedContent, ContentSection, ContentImage } from '../types';

/**
 * Extract content from a Study Kit for PDF generation
 */
export async function extractStudyKitContent(
  kitId: string,
  materialId?: string
): Promise<ExtractedContent> {
  // Fetch study kit from API
  const response = await fetch(`/api/study-kit/${kitId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch study kit: ${response.status}`);
  }

  const studyKit = await response.json();

  // Extract content based on available materials
  const sections: ContentSection[] = [];
  const images: ContentImage[] = [];

  // If specific material requested, only extract that
  if (materialId) {
    const material = getMaterialById(studyKit, materialId);
    if (material) {
      sections.push(...extractMaterialSections(material));
      images.push(...extractMaterialImages(material));
    }
  } else {
    // Extract all materials
    if (studyKit.summary) {
      sections.push(...extractSummarySections(studyKit.summary));
    }

    if (studyKit.mindmap) {
      sections.push(...extractMindmapSections(studyKit.mindmap));
    }

    if (studyKit.quiz) {
      sections.push(...extractQuizSections(studyKit.quiz));
    }
  }

  // Calculate reading time (average 200 words per minute)
  const wordCount = calculateWordCount(sections);
  const readingTime = Math.ceil(wordCount / 200);

  return {
    title: studyKit.title,
    subject: studyKit.subject,
    sections,
    images,
    metadata: {
      wordCount,
      readingTime,
      generatedAt: new Date().toISOString(),
      sourceKitId: kitId,
      sourceMaterialId: materialId,
    },
  };
}

/**
 * Get specific material by ID from study kit
 */
function getMaterialById(studyKit: Record<string, unknown>, materialId: string): unknown {
  // Check which material type matches the ID
  if (materialId.startsWith('summary')) return studyKit.summary;
  if (materialId.startsWith('mindmap')) return studyKit.mindmap;
  if (materialId.startsWith('quiz')) return studyKit.quiz;
  if (materialId.startsWith('demo')) return studyKit.demo;
  return null;
}

/**
 * Extract sections from summary text
 */
function extractSummarySections(summary: string): ContentSection[] {
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
function extractMindmapSections(mindmap: Record<string, unknown>): ContentSection[] {
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

/**
 * Extract sections from quiz data
 */
function extractQuizSections(quiz: Record<string, unknown>): ContentSection[] {
  const sections: ContentSection[] = [];

  sections.push({
    type: 'heading',
    content: 'Quiz di Verifica',
    level: 2,
  });

  const questions = quiz.questions as Array<{
    question: string;
    options?: string[];
    explanation?: string;
  }> | undefined;

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
 * Extract sections from a generic material
 */
function extractMaterialSections(material: unknown): ContentSection[] {
  if (!material || typeof material !== 'object') {
    return [];
  }

  const mat = material as Record<string, unknown>;

  if (typeof mat.content === 'string') {
    return extractSummarySections(mat.content);
  }

  if (mat.questions) {
    return extractQuizSections(mat);
  }

  if (mat.nodes || mat.central) {
    return extractMindmapSections(mat);
  }

  return [];
}

/**
 * Extract images from material
 */
function extractMaterialImages(material: unknown): ContentImage[] {
  const images: ContentImage[] = [];

  if (!material || typeof material !== 'object') {
    return images;
  }

  const mat = material as Record<string, unknown>;

  // Check for images array
  if (mat.images && Array.isArray(mat.images)) {
    for (const img of mat.images) {
      if (typeof img === 'object' && img !== null) {
        const imgObj = img as { src?: string; url?: string; alt?: string; caption?: string };
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
function calculateWordCount(sections: ContentSection[]): number {
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
export function estimateReadingTime(
  wordCount: number,
  profile: string
): number {
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
