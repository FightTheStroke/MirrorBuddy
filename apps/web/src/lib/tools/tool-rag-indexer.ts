// ============================================================================
// TOOL RAG INDEXER
// Indexes tool outputs for semantic search in conversations
// Plan 44 - Tool Alignment with Maestri (W2-ContextIntegration, T2-03)
// F-03: Conversazione considera contenuti generati per retrieval semantico
// ============================================================================

import { logger } from "@/lib/logger";
import { isEmbeddingConfigured } from "@/lib/rag";
import {
  generatePrivacyAwareEmbedding,
  storeEmbedding,
} from "@/lib/rag/server";
import type { StoredToolOutput } from "./tool-output-types";
import type { ToolType } from "@/types/tools/tool-types";

/**
 * Extract searchable text content from tool output data
 * Different tools store their content in different structures
 */
export function extractSearchableText(
  toolType: ToolType,
  data: Record<string, unknown>,
): string {
  try {
    switch (toolType) {
      case "mindmap":
        return (data.markdown as string) || JSON.stringify(data);

      case "quiz": {
        const questions = data.questions as Array<{
          question?: string;
          answers?: Array<{ text?: string }>;
          explanation?: string;
        }>;
        if (Array.isArray(questions)) {
          return questions
            .map((q) =>
              [
                q.question,
                ...(q.answers?.map((a) => a.text) || []),
                q.explanation,
              ]
                .filter(Boolean)
                .join(" "),
            )
            .join("\n");
        }
        break;
      }

      case "flashcard": {
        const cards = data.cards as Array<{ front?: string; back?: string }>;
        if (Array.isArray(cards)) {
          return cards
            .map((c) => `${c.front || ""} ${c.back || ""}`)
            .join("\n");
        }
        break;
      }

      case "summary":
        return [data.summary, data.content].filter(Boolean).join("\n");

      case "timeline": {
        const events = data.events as Array<{
          title?: string;
          description?: string;
        }>;
        if (Array.isArray(events)) {
          return events
            .map((e) => `${e.title || ""} ${e.description || ""}`)
            .join("\n");
        }
        break;
      }

      case "diagram":
        return [data.mermaid, data.description].filter(Boolean).join("\n");

      case "formula":
        return [data.latex, data.explanation].filter(Boolean).join("\n");

      case "homework": {
        const hints = (data.hints as string[]) || [];
        return [data.question, data.solution, ...hints]
          .filter(Boolean)
          .join("\n");
      }

      case "study-kit": {
        const materials = data.materials as Array<{
          title?: string;
          summary?: string;
        }>;
        if (Array.isArray(materials)) {
          return materials
            .map((m) => `${m.title || ""} ${m.summary || ""}`)
            .join("\n");
        }
        break;
      }
    }

    // Default: stringify with size limit
    const text = JSON.stringify(data);
    return text.length > 10000 ? text.substring(0, 10000) : text;
  } catch (error) {
    logger.error("Failed to extract searchable text", { toolType }, error);
    return JSON.stringify(data).substring(0, 1000);
  }
}

/**
 * Index a tool output for semantic search
 * Creates an embedding and stores it in the vector database
 *
 * @param toolOutput - The stored tool output to index
 * @param userId - The user who owns this content
 * @param conversationId - Optional conversation context for filtering
 * @returns The embedding ID if successful, null otherwise
 */
export async function indexToolOutput(
  toolOutput: StoredToolOutput,
  userId: string,
  conversationId?: string,
): Promise<string | null> {
  // Skip if embedding service not configured
  if (!isEmbeddingConfigured()) {
    logger.debug(
      "[ToolRAG] Embedding service not configured, skipping indexing",
      {
        toolOutputId: toolOutput.id,
      },
    );
    return null;
  }

  try {
    // Extract searchable text from tool data
    const searchableText = extractSearchableText(
      toolOutput.toolType as ToolType,
      toolOutput.data,
    );

    if (!searchableText || searchableText.trim().length === 0) {
      logger.warn("[ToolRAG] No searchable text extracted from tool output", {
        toolOutputId: toolOutput.id,
        toolType: toolOutput.toolType,
      });
      return null;
    }

    // Generate embedding with privacy protection (anonymizes PII before embedding)
    logger.debug(
      "[ToolRAG] Generating privacy-aware embedding for tool output",
      {
        toolOutputId: toolOutput.id,
        toolType: toolOutput.toolType,
        textLength: searchableText.length,
      },
    );

    const embedding = await generatePrivacyAwareEmbedding(searchableText);

    // Store in vector database
    const stored = await storeEmbedding({
      userId,
      sourceType: "tool",
      sourceId: toolOutput.id,
      content: searchableText,
      vector: embedding.vector,
      model: embedding.model,
      tags: [toolOutput.toolType, conversationId].filter(Boolean) as string[],
    });

    logger.info("[ToolRAG] Tool output indexed successfully", {
      toolOutputId: toolOutput.id,
      embeddingId: stored.id,
      toolType: toolOutput.toolType,
      tokens: embedding.usage.tokens,
    });

    return stored.id;
  } catch (error) {
    logger.error(
      "[ToolRAG] Failed to index tool output",
      {
        toolOutputId: toolOutput.id,
        toolType: toolOutput.toolType,
      },
      error,
    );
    return null;
  }
}

/**
 * Batch index multiple tool outputs
 * More efficient than indexing one at a time
 *
 * @param toolOutputs - Array of tool outputs to index
 * @param userId - The user who owns this content
 * @param conversationId - Optional conversation context
 * @returns Array of embedding IDs (null for failed items)
 */
export async function batchIndexToolOutputs(
  toolOutputs: StoredToolOutput[],
  userId: string,
  conversationId?: string,
): Promise<Array<string | null>> {
  if (!isEmbeddingConfigured()) {
    logger.debug(
      "[ToolRAG] Embedding service not configured, skipping batch indexing",
    );
    return toolOutputs.map(() => null);
  }

  logger.info("[ToolRAG] Starting batch indexing", {
    count: toolOutputs.length,
    userId,
  });

  const results = await Promise.allSettled(
    toolOutputs.map((output) =>
      indexToolOutput(output, userId, conversationId),
    ),
  );

  const embeddingIds = results.map((result) =>
    result.status === "fulfilled" ? result.value : null,
  );

  const successCount = embeddingIds.filter((id) => id !== null).length;
  logger.info("[ToolRAG] Batch indexing completed", {
    total: toolOutputs.length,
    success: successCount,
    failed: toolOutputs.length - successCount,
  });

  return embeddingIds;
}
