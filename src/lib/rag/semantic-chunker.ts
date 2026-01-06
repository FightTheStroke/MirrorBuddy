/**
 * Semantic Text Chunker for RAG Pipeline
 * Splits text into overlapping chunks while respecting semantic boundaries.
 * @module rag/semantic-chunker
 */

/**
 * Represents a chunk of text with metadata
 */
export interface TextChunk {
  content: string;
  index: number;
  startIndex: number;
  endIndex: number;
  tokenEstimate: number;
}

/**
 * Options for chunking text
 */
export interface ChunkOptions {
  /** Maximum characters per chunk (default: 500) */
  maxChunkSize?: number;
  /** Overlap between chunks in characters (default: 50) */
  overlap?: number;
  /** Try to respect paragraph boundaries (default: true) */
  respectParagraphs?: boolean;
}

/** Common abbreviations that don't end sentences */
const ABBREVIATIONS = new Set([
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
    if (currentChunk.length + segmentWithSpace.length > maxChunkSize && currentChunk.length > 0) {
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
      const overlapContent = getOverlapContent(currentChunk, overlap);
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

/**
 * Gets overlap content from end of previous chunk
 */
function getOverlapContent(text: string, overlap: number): string {
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

/**
 * Fallback character-based chunking for text without clear sentence boundaries
 */
function chunkByCharacters(text: string, maxSize: number, overlap: number): TextChunk[] {
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
