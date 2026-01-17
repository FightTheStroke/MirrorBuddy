/**
 * Tool Output Types
 * Extracted to break circular dependency between tool-output-storage and tool-rag-indexer
 */

import type { ToolType } from '@/types/tools';

/**
 * Tool output data structure for storage
 */
export interface ToolOutputData {
  conversationId: string;
  toolType: ToolType;
  toolId?: string; // Reference to Material if persisted
  data: Record<string, unknown>; // Tool-specific output data
}

/**
 * Options for saving tool outputs
 */
export interface SaveToolOutputOptions {
  /** Enable RAG indexing for semantic search (default: true) */
  enableRAG?: boolean;
  /** User ID for RAG indexing (required if enableRAG is true) */
  userId?: string;
}

/**
 * Stored tool output with metadata
 */
export interface StoredToolOutput {
  id: string;
  conversationId: string;
  toolType: string;
  toolId: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
}
