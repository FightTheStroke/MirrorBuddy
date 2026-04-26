/**
 * Semantic Text Chunker for RAG Pipeline
 * Splits text into overlapping chunks while respecting semantic boundaries.
 * @module rag/semantic-chunker
 */

import {
  chunkByParagraphs,
  chunkBySentences,
  chunkByCharacters,
} from './chunking-strategies';
import { estimateTokens, getOverlapContent } from './chunker-utils';
import type { TextChunk, ChunkOptions } from './chunker-types';

// Re-export types for backward compatibility
export type { TextChunk, ChunkOptions } from './chunker-types';

/**
 * Main chunking function - splits text into overlapping chunks
 * respecting semantic boundaries (sentences, paragraphs)
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const { maxChunkSize = 500, overlap = 50, respectParagraphs = true } = options;

  if (!text || text.trim().length === 0) return [];

  const cleanText = text.trim();

  // If text is shorter than max size, return single chunk
  if (cleanText.length <= maxChunkSize) {
    return [
      {
        content: cleanText,
        index: 0,
        startIndex: 0,
        endIndex: cleanText.length,
        tokenEstimate: estimateTokens(cleanText),
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let segments: string[];

  // First try paragraph-based chunking
  if (respectParagraphs) {
    const paragraphs = chunkByParagraphs(cleanText);
    segments = paragraphs.length > 1 ? paragraphs : chunkBySentences(cleanText);
  } else {
    segments = chunkBySentences(cleanText);
  }

  // If no segments, fall back to character-based chunking
  if (segments.length === 0) {
    return chunkByCharacters(cleanText, maxChunkSize, overlap);
  }

  let currentChunk = '';
  let currentStart = 0;
  let textPosition = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    // Handle segments that exceed max size by themselves
    if (segment.length > maxChunkSize) {
      // Save current chunk if any
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          index: chunks.length,
          startIndex: currentStart,
          endIndex: textPosition,
          tokenEstimate: estimateTokens(currentChunk.trim()),
        });
      }

      // Split the oversized segment using character-based chunking
      const segmentStart = cleanText.indexOf(segment, textPosition);
      const subChunks = chunkByCharacters(segment, maxChunkSize, overlap);
      for (const sub of subChunks) {
        chunks.push({
          content: sub.content,
          index: chunks.length,
          startIndex: segmentStart + sub.startIndex,
          endIndex: segmentStart + sub.endIndex,
          tokenEstimate: sub.tokenEstimate,
        });
      }

      // Reset for next segment
      currentChunk = '';
      currentStart = segmentStart + segment.length;
      textPosition = currentStart;
      continue;
    }

    const segmentWithSpace = currentChunk.length > 0 ? ' ' + segment : segment;

    // Check if adding this segment would exceed max size
    if (
      currentChunk.length + segmentWithSpace.length > maxChunkSize &&
      currentChunk.length > 0
    ) {
      // Save current chunk
      const chunkEnd = textPosition;
      chunks.push({
        content: currentChunk,
        index: chunks.length,
        startIndex: currentStart,
        endIndex: chunkEnd,
        tokenEstimate: estimateTokens(currentChunk),
      });

      // Start new chunk with overlap
      const overlapContent = getOverlapContent(currentChunk, overlap, chunkBySentences);
      currentChunk = overlapContent + (overlapContent ? ' ' : '') + segment;
      currentStart = Math.max(0, chunkEnd - overlap);
    } else {
      currentChunk += segmentWithSpace;
    }

    // Update position in original text
    const segmentIndex = cleanText.indexOf(segment, textPosition);
    if (segmentIndex !== -1) {
      textPosition = segmentIndex + segment.length;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunks.length,
      startIndex: currentStart,
      endIndex: cleanText.length,
      tokenEstimate: estimateTokens(currentChunk.trim()),
    });
  }

  return chunks;
}

// Re-export utility functions for convenience
export { chunkByParagraphs, chunkBySentences, chunkByCharacters } from './chunking-strategies';
export { estimateTokens } from './chunker-utils';
