/**
 * Content Extraction Helpers
 * Utilities for working with study kit materials
 */

import type { ContentSection, ContentImage } from '../types';
import { extractSummarySections } from './summary-parser';
import { extractMindmapSections } from './mindmap-parser';
import { extractQuizSections } from './quiz-parser';

// UUID v4 pattern for validation (prevents SSRF by ensuring kitId is a valid UUID)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a kitId is a valid UUID to prevent SSRF attacks
 */
export function isValidKitId(kitId: string): boolean {
  return UUID_PATTERN.test(kitId);
}

/**
 * Get specific material by ID from study kit
 */
export function getMaterialById(studyKit: Record<string, unknown>, materialId: string): unknown {
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
export function extractMaterialSections(material: unknown): ContentSection[] {
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
