/**
 * Summary Indexer for RAG Pipeline
 * Indexes conversation summaries into the vector store for semantic search.
 * @module rag/summary-indexer
 */

import { prisma } from "@/lib/db";
import { generatePrivacyAwareEmbedding } from "./privacy-aware-embedding";
import { storeEmbedding } from "./vector-store";
import { logger } from "@/lib/logger";

/**
 * Metadata for conversation summary indexing
 */
export interface SummaryMetadata {
  maestroId?: string;
  topics?: string[];
}

/**
 * Index a conversation summary into the RAG system.
 * Generates embedding for the summary text and stores it with sourceType='conversation_summary'.
 * Handles duplicates by deleting the existing embedding and creating a new one (upsert).
 *
 * @param conversationId - Unique identifier for the conversation
 * @param userId - User ID who owns the conversation
 * @param summary - Summary text to index
 * @param metadata - Optional metadata (maestroId, topics)
 * @throws Error if summary is empty or embedding generation fails
 */
export async function indexConversationSummary(
  conversationId: string,
  userId: string,
  summary: string,
  metadata?: SummaryMetadata,
): Promise<void> {
  // Validate input
  if (!summary || summary.trim().length === 0) {
    throw new Error("Summary text cannot be empty");
  }

  logger.debug("[SummaryIndexer] Indexing conversation summary", {
    conversationId,
    userId,
    summaryLength: summary.length,
    metadata,
  });

  // Check for existing embedding (upsert logic)
  const existingEmbedding = await prisma.contentEmbedding.findFirst({
    where: {
      userId,
      sourceType: "conversation_summary",
      sourceId: conversationId,
    },
  });

  if (existingEmbedding) {
    logger.debug("[SummaryIndexer] Deleting existing embedding", {
      embeddingId: existingEmbedding.id,
    });
    await prisma.contentEmbedding.delete({
      where: { id: existingEmbedding.id },
    });
  }

  // Generate privacy-aware embedding (anonymizes PII before embedding)
  const embeddingResult = await generatePrivacyAwareEmbedding(summary);

  // Format metadata as tags
  const tags: string[] = [];
  if (metadata?.maestroId) {
    tags.push(`maestro:${metadata.maestroId}`);
  }
  if (metadata?.topics) {
    for (const topic of metadata.topics) {
      tags.push(`topic:${topic}`);
    }
  }

  // Store embedding
  await storeEmbedding({
    userId,
    sourceType: "conversation_summary",
    sourceId: conversationId,
    chunkIndex: 0,
    content: summary,
    vector: embeddingResult.vector,
    model: embeddingResult.model,
    subject: undefined,
    tags,
  });

  logger.info("[SummaryIndexer] Successfully indexed conversation summary", {
    conversationId,
    userId,
    embeddingTokens: embeddingResult.usage.tokens,
    tagsCount: tags.length,
  });
}
