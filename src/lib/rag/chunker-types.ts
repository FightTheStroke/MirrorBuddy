/**
 * Type definitions for semantic chunker
 * @module rag/chunker-types
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
