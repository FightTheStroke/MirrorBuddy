/**
 * Utility functions and constants for semantic chunking
 * @module rag/chunker-utils
 */

/** Common abbreviations that don't end sentences */
export const ABBREVIATIONS = new Set([
  'dr',
  'mr',
  'mrs',
  'ms',
  'prof',
  'sr',
  'jr',
  'vs',
  'etc',
  'inc',
  'ltd',
  'co',
  'corp',
  'fig',
  'vol',
  'no',
  'ed',
  'rev',
  'est',
  'approx',
  'dept',
  'govt',
  'univ',
  'assoc',
  'bros',
  'gen',
  'hon',
  'lt',
  'sgt',
  'capt',
  'cmdr',
  'col',
  'maj',
  'adm',
  'st',
  'ave',
  'blvd',
  'rd',
  'dott',
  'sig',
  'sig.ra',
  'ing',
  'arch',
  'avv',
]);

/**
 * Estimates token count for text (roughly 4 chars per token for English/Italian)
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  // Rough estimation: ~4 characters per token for Latin languages
  // This is conservative; actual token count may vary by model
  return Math.ceil(text.length / 4);
}

/**
 * Gets overlap content from end of previous chunk
 * @param text The text to extract overlap from
 * @param overlap Maximum overlap size in characters
 * @returns Overlap content string
 */
export function getOverlapContent(
  text: string,
  overlap: number,
  chunkBySentences: (t: string) => string[]
): string {
  if (text.length <= overlap) return text;

  // Try to find a sentence boundary within the overlap region
  const overlapRegion = text.slice(-overlap * 2);
  const sentences = chunkBySentences(overlapRegion);

  if (sentences.length > 1) {
    // Return last sentence(s) that fit within overlap
    let result = '';
    for (let i = sentences.length - 1; i >= 0; i--) {
      const candidate = sentences[i] + (result ? ' ' + result : '');
      if (candidate.length <= overlap * 1.5) {
        result = candidate;
      } else {
        break;
      }
    }
    return result || text.slice(-overlap);
  }

  // Fall back to character-based overlap
  return text.slice(-overlap);
}
