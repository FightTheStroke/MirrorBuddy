// ============================================================================
// TEXT ANALYSIS UTILITIES
// ============================================================================

import type { SummarySection } from './tool-data-types-educational';

/**
 * Counts words in a text string, removing markdown formatting
 */
export function countWords(content: string): number {
  if (!content) return 0;
  return content
    .replace(/[#*_`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

/**
 * Calculates total word count for a SummaryData structure
 */
export function calculateSummaryWordCount(sections: SummarySection[]): number {
  return sections.reduce((total, section) => {
    const contentWords = countWords(section.content);
    const keyPointsWords = (section.keyPoints || []).reduce(
      (sum, point) => sum + countWords(point),
      0
    );
    return total + contentWords + keyPointsWords;
  }, 0);
}
