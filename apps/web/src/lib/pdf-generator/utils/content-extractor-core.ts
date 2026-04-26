/**
 * Content Extractor Core
 * Main extraction logic for Study Kit materials
 */

import type { ExtractedContent, ContentSection } from '../types';
import {
  extractSummarySections,
  extractMindmapSections,
  extractQuizSections,
  calculateWordCount,
} from './content-extractor-parsers';

/**
 * Extract content from a Study Kit for PDF generation
 * Can accept either kitId (for client-side) or studyKit object (for server-side)
 */
export async function extractStudyKitContent(
  kitIdOrStudyKit: string | Record<string, unknown>,
  materialId?: string
): Promise<ExtractedContent> {
  let studyKit: Record<string, unknown>;

  // If it's a string, it's a kitId - fetch from API (client-side)
  if (typeof kitIdOrStudyKit === 'string') {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const url = `${baseUrl}/api/study-kit/${kitIdOrStudyKit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch study kit: ${response.status}`);
    }

    const data = await response.json();
    studyKit = data.studyKit || data;
  } else {
    // It's already a studyKit object (server-side)
    studyKit = kitIdOrStudyKit;
  }

  // Extract content based on available materials
  const sections: ContentSection[] = [];

  // If specific material requested, only extract that
  if (materialId) {
    const material = getMaterialById(studyKit, materialId);
    if (material) {
      sections.push(...extractMaterialSectionsHelper(material));
    }
  } else {
    // Extract all materials
    if (studyKit.summary) {
      const summaryText =
        typeof studyKit.summary === 'string'
          ? studyKit.summary
          : String(studyKit.summary);
      sections.push(...extractSummarySections(summaryText));
    }

    if (studyKit.mindmap) {
      const mindmapData =
        typeof studyKit.mindmap === 'string'
          ? JSON.parse(studyKit.mindmap)
          : studyKit.mindmap;
      sections.push(...extractMindmapSections(mindmapData));
    }

    if (studyKit.quiz) {
      const quizData =
        typeof studyKit.quiz === 'string'
          ? JSON.parse(studyKit.quiz)
          : studyKit.quiz;
      sections.push(...extractQuizSections(quizData));
    }
  }

  // Calculate reading time (average 200 words per minute)
  const wordCount = calculateWordCount(sections);
  const readingTime = Math.ceil(wordCount / 200);

  const kitId =
    typeof studyKit.id === 'string' ? studyKit.id : String(studyKit.id || '');

  return {
    title: String(studyKit.title || 'Untitled'),
    subject: studyKit.subject ? String(studyKit.subject) : undefined,
    sections,
    images: [],
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
function getMaterialById(
  studyKit: Record<string, unknown>,
  materialId: string
): unknown {
  // Check which material type matches the ID
  if (materialId.startsWith('summary')) return studyKit.summary;
  if (materialId.startsWith('mindmap')) return studyKit.mindmap;
  if (materialId.startsWith('quiz')) return studyKit.quiz;
  if (materialId.startsWith('demo')) return studyKit.demo;
  return null;
}

/**
 * Extract sections from a generic material
 */
function extractMaterialSectionsHelper(material: unknown): ContentSection[] {
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
