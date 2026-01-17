/**
 * Chunking strategies for semantic text splitting
 * @module rag/chunking-strategies
 */

import type { TextChunk } from './chunker-types';
import { estimateTokens, ABBREVIATIONS } from './chunker-utils';

/**
 * Splits text into paragraphs by double newlines
 */
export function chunkByParagraphs(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Splits text into sentences, respecting abbreviations and decimal numbers
 */
export function chunkBySentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const sentences: string[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    current += char;

    // Check for sentence-ending punctuation
    if (char === '.' || char === '!' || char === '?') {
      const nextChar = text[i + 1];

      // Check if this is actually end of sentence
      if (!nextChar || nextChar === ' ' || nextChar === '\n') {
        // Check for abbreviations
        const words = current.trim().split(/\s+/);
        const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.!?]$/, '');

        // Check for decimal numbers (e.g., 3.14)
        const beforeDot = current.slice(-10, -1);
        const isDecimal = /\d$/.test(beforeDot) && /^\d/.test(text.slice(i + 1, i + 3));

        if (!ABBREVIATIONS.has(lastWord) && !isDecimal && char === '.') {
          sentences.push(current.trim());
          current = '';
        } else if (char === '!' || char === '?') {
          sentences.push(current.trim());
          current = '';
        }
      }
    }
    i++;
  }

  // Add remaining text
  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences;
}

/**
 * Character-based chunking for text without clear sentence boundaries
 * @param text The text to chunk
 * @param maxSize Maximum chunk size in characters
 * @param overlap Overlap between chunks in characters
 * @returns Array of text chunks
 */
export function chunkByCharacters(
  text: string,
  maxSize: number,
  overlap: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // Try to find a word boundary
    if (end < text.length) {
      const spaceIndex = text.lastIndexOf(' ', end);
      if (spaceIndex > start + maxSize / 2) {
        end = spaceIndex;
      }
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        index: chunks.length,
        startIndex: start,
        endIndex: end,
        tokenEstimate: estimateTokens(content),
      });
    }

    start = end - overlap;
    if (start >= text.length - overlap) break;
  }

  return chunks;
}
