/**
 * Content Extractor
 * Extracts content from Study Kit materials for PDF generation
 */

import type { ExtractedContent, ContentSection, ContentImage } from '../types';
import {
  isValidKitId,
  getMaterialById,
  extractMaterialSections,
  extractMaterialImages,
  calculateWordCount,
} from './content-helpers';
import { extractSummarySections } from './summary-parser';
import { extractMindmapSections } from './mindmap-parser';
import { extractQuizSections } from './quiz-parser';

export { estimateReadingTime } from './content-helpers';

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
    // Security: Validate kitId is a UUID to prevent SSRF attacks
    if (!isValidKitId(kitIdOrStudyKit)) {
      throw new Error('Invalid kit ID format');
    }

    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const url = `${baseUrl}/api/study-kit/${encodeURIComponent(kitIdOrStudyKit)}`;
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
      const summaryText = typeof studyKit.summary === 'string' ? studyKit.summary : String(studyKit.summary);
      sections.push(...extractSummarySections(summaryText));
    }

    if (studyKit.mindmap) {
      const mindmapData = typeof studyKit.mindmap === 'string' ? JSON.parse(studyKit.mindmap) : studyKit.mindmap;
      sections.push(...extractMindmapSections(mindmapData));
    }

    if (studyKit.quiz) {
      const quizData = typeof studyKit.quiz === 'string' ? JSON.parse(studyKit.quiz) : studyKit.quiz;
      sections.push(...extractQuizSections(quizData));
    }
  }

  // Calculate reading time (average 200 words per minute)
  const wordCount = calculateWordCount(sections);
  const readingTime = Math.ceil(wordCount / 200);

  const kitId = typeof studyKit.id === 'string' ? studyKit.id : String(studyKit.id || '');

  return {
    title: String(studyKit.title || 'Untitled'),
    subject: studyKit.subject ? String(studyKit.subject) : undefined,
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
