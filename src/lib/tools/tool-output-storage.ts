// ============================================================================
// TOOL OUTPUT STORAGE SERVICE
// Manages persistence of tool execution outputs linked to conversations
// Plan 44 - Tool Alignment with Maestri (W2-ContextIntegration, T2-01)
// F-03, F-04: Conversation considers contenuti generati/caricati
// ============================================================================

import { prisma } from "@/lib/db";
import type { ToolOutput as PrismaToolOutput } from "@prisma/client";
import { logger } from "@/lib/logger";
import type { ToolType } from "@/types/tools";
import { indexToolOutput } from "./tool-rag-indexer";
import type {
  SaveToolOutputOptions,
  StoredToolOutput,
} from "./tool-output-types";

// Re-export types for backwards compatibility
export type {
  ToolOutputData,
  SaveToolOutputOptions,
  StoredToolOutput,
} from "./tool-output-types";

/**
 * Save a tool output to the database
 * Links the output to a conversation for later retrieval
 * Optionally indexes for semantic search (RAG)
 *
 * @param conversationId - The conversation this tool was executed in
 * @param toolType - Type of tool (mindmap, quiz, flashcard, etc.)
 * @param data - Tool-specific output data
 * @param toolId - Optional reference to Material if persisted
 * @param options - Additional options (RAG indexing, user ID)
 * @returns The created tool output record
 */
export async function saveToolOutput(
  conversationId: string,
  toolType: ToolType,
  data: Record<string, unknown>,
  toolId?: string,
  options: SaveToolOutputOptions = {},
): Promise<StoredToolOutput> {
  const { enableRAG = true, userId } = options;

  try {
    const toolOutput = await prisma.toolOutput.create({
      data: {
        conversationId,
        toolType,
        toolId: toolId || null,
        data: JSON.stringify(data),
      },
    });

    logger.info("Tool output saved", {
      id: toolOutput.id,
      conversationId,
      toolType,
      toolId,
    });

    const storedOutput: StoredToolOutput = {
      ...toolOutput,
      data: JSON.parse(toolOutput.data),
    };

    // Index for semantic search if enabled and userId provided
    if (enableRAG && userId) {
      // Don't await - index asynchronously to avoid blocking
      indexToolOutput(storedOutput, userId, conversationId).catch((err) => {
        logger.error(
          "Failed to index tool output (non-blocking)",
          {
            toolOutputId: toolOutput.id,
          },
          err,
        );
      });
    }

    return storedOutput;
  } catch (error) {
    logger.error(
      "Failed to save tool output",
      {
        conversationId,
        toolType,
      },
      error,
    );
    throw error;
  }
}

/**
 * Get all tool outputs for a conversation
 * Useful for retrieving conversation context with generated materials
 *
 * @param conversationId - The conversation ID
 * @returns Array of tool outputs ordered by creation date (newest first)
 */
export async function getToolOutputs(
  conversationId: string,
): Promise<StoredToolOutput[]> {
  try {
    const outputs = await prisma.toolOutput.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
    });

    return outputs.map((output: PrismaToolOutput) => ({
      ...output,
      data: JSON.parse(output.data),
    }));
  } catch (error) {
    logger.error("Failed to get tool outputs", { conversationId }, error);
    throw error;
  }
}

/**
 * Get tool outputs filtered by type for a conversation
 * Useful for retrieving specific tool types (e.g., all mindmaps in a conversation)
 *
 * @param conversationId - The conversation ID
 * @param toolType - Type of tool to filter by
 * @returns Array of matching tool outputs ordered by creation date (newest first)
 */
export async function getToolOutputsByType(
  conversationId: string,
  toolType: ToolType,
): Promise<StoredToolOutput[]> {
  try {
    const outputs = await prisma.toolOutput.findMany({
      where: {
        conversationId,
        toolType,
      },
      orderBy: { createdAt: "desc" },
    });

    return outputs.map((output: PrismaToolOutput) => ({
      ...output,
      data: JSON.parse(output.data),
    }));
  } catch (error) {
    logger.error(
      "Failed to get tool outputs by type",
      {
        conversationId,
        toolType,
      },
      error,
    );
    throw error;
  }
}

/**
 * Get the count of tool outputs for a conversation
 * Useful for displaying how many materials have been generated
 *
 * @param conversationId - The conversation ID
 * @returns Total count of tool outputs
 */
export async function getToolOutputCount(
  conversationId: string,
): Promise<number> {
  try {
    return await prisma.toolOutput.count({
      where: { conversationId },
    });
  } catch (error) {
    logger.error("Failed to get tool output count", { conversationId }, error);
    return 0;
  }
}

/**
 * Get tool output statistics by type for a conversation
 * Useful for showing a breakdown of generated materials
 *
 * @param conversationId - The conversation ID
 * @returns Object with counts per tool type
 */
export async function getToolOutputStats(
  conversationId: string,
): Promise<Record<string, number>> {
  try {
    const outputs = await prisma.toolOutput.findMany({
      where: { conversationId },
      select: { toolType: true },
    });

    const stats: Record<string, number> = {};
    for (const output of outputs) {
      stats[output.toolType] = (stats[output.toolType] || 0) + 1;
    }

    return stats;
  } catch (error) {
    logger.error("Failed to get tool output stats", { conversationId }, error);
    return {};
  }
}

/**
 * Delete tool outputs for a conversation
 * Useful for cleanup when conversation is deleted (handled by CASCADE)
 *
 * @param conversationId - The conversation ID
 * @returns Number of deleted records
 */
export async function deleteToolOutputs(
  conversationId: string,
): Promise<number> {
  try {
    const result = await prisma.toolOutput.deleteMany({
      where: { conversationId },
    });

    logger.info("Tool outputs deleted", {
      conversationId,
      count: result.count,
    });

    return result.count;
  } catch (error) {
    logger.error("Failed to delete tool outputs", { conversationId }, error);
    throw error;
  }
}
