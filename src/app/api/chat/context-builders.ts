/**
 * Chat API context builders
 * Extracts and injects various contexts into system prompts
 */

import { logger } from "@/lib/logger";
import { loadPreviousContext } from "@/lib/conversation/memory-loader";
import { enhanceSystemPrompt } from "@/lib/conversation/prompt-enhancer";
import {
  findSimilarMaterials,
  findRelatedConcepts,
} from "@/lib/rag/retrieval-service";
import { buildToolContext } from "@/lib/tools/tool-context-builder";
import { getMaestroById } from "@/data/maestri";
import {
  buildAdaptiveInstruction,
  getAdaptiveContextForUser,
} from "@/lib/education/adaptive-difficulty";
import { getLanguageInstruction } from "@/lib/i18n/language-instructions";
import type { SupportedLanguage } from "./types";

export interface ContextResult {
  enhancedPrompt: string;
  hasMemory: boolean;
  hasToolContext: boolean;
  hasRAG: boolean;
  ragResultsForTransparency: Array<{
    content: string;
    similarity: number;
    sourceType?: string;
  }>;
}

interface ContextOptions {
  systemPrompt: string;
  userId?: string;
  maestroId?: string;
  conversationId?: string;
  enableMemory?: boolean;
  lastUserMessage?: string;
  adaptiveDifficultyMode?: string | null;
  requestedTool?: string;
  language?: SupportedLanguage;
}

/**
 * Inject conversation memory into system prompt
 */
export async function injectMemoryContext(
  systemPrompt: string,
  userId: string,
  maestroId: string,
): Promise<{ enhancedPrompt: string; hasMemory: boolean }> {
  try {
    const memory = await loadPreviousContext(userId, maestroId);
    if (memory.recentSummary || memory.keyFacts.length > 0) {
      const enhanced = enhanceSystemPrompt({
        basePrompt: systemPrompt,
        memory,
        // ADR 0064: Pass characterId for automatic formal/informal address detection
        safetyOptions: { role: "maestro", characterId: maestroId },
      });
      logger.debug("Conversation memory injected", {
        maestroId,
        keyFactCount: memory.keyFacts.length,
        hasSummary: !!memory.recentSummary,
      });
      return { enhancedPrompt: enhanced, hasMemory: true };
    }
  } catch (memoryError) {
    logger.warn("Failed to load conversation memory", {
      userId,
      maestroId,
      error: String(memoryError),
    });
  }
  return { enhancedPrompt: systemPrompt, hasMemory: false };
}

/**
 * Inject tool context (generated content from conversation)
 */
export async function injectToolContextData(
  systemPrompt: string,
  userId: string,
  conversationId: string,
): Promise<{ enhancedPrompt: string; hasToolContext: boolean }> {
  try {
    const toolContext = await buildToolContext(userId, conversationId);
    if (toolContext.toolCount > 0) {
      const enhanced = `${systemPrompt}\n\n${toolContext.formattedContext}`;
      logger.debug("Tool context injected", {
        conversationId,
        toolCount: toolContext.toolCount,
        types: toolContext.types,
      });
      return { enhancedPrompt: enhanced, hasToolContext: true };
    }
  } catch (toolContextError) {
    logger.warn("Failed to load tool context", {
      userId,
      conversationId,
      error: String(toolContextError),
    });
  }
  return { enhancedPrompt: systemPrompt, hasToolContext: false };
}

/**
 * Inject RAG context (relevant materials and study kits)
 */
export async function injectRAGContext(
  systemPrompt: string,
  userId: string,
  query: string,
): Promise<{
  enhancedPrompt: string;
  hasRAG: boolean;
  ragResults: Array<{
    content: string;
    similarity: number;
    sourceType?: string;
  }>;
}> {
  try {
    const relevantMaterials = await findSimilarMaterials({
      userId,
      query,
      limit: 3,
      minSimilarity: 0.6,
    });

    const relatedStudyKits = await findRelatedConcepts({
      userId,
      query,
      limit: 3,
      minSimilarity: 0.5,
      includeFlashcards: false,
      includeStudykits: true,
    });

    const allResults = [...relevantMaterials, ...relatedStudyKits];
    const ragResults = allResults.map((r) => ({
      content: r.content,
      similarity: r.similarity,
      sourceType: "material",
    }));

    if (allResults.length > 0) {
      const ragContext = allResults.map((m) => `- ${m.content}`).join("\n");
      const enhanced = `${systemPrompt}\n\n[Materiali rilevanti dello studente]\n${ragContext}`;
      logger.debug("RAG context injected", {
        userId,
        materialCount: relevantMaterials.length,
        studyKitCount: relatedStudyKits.length,
        topSimilarity: allResults[0]?.similarity,
      });
      return { enhancedPrompt: enhanced, hasRAG: true, ragResults };
    }
  } catch (ragError) {
    logger.warn("Failed to load RAG context", {
      userId,
      error: String(ragError),
    });
  }
  return { enhancedPrompt: systemPrompt, hasRAG: false, ragResults: [] };
}

/**
 * Inject adaptive difficulty context
 */
export async function injectAdaptiveContext(
  systemPrompt: string,
  userId: string,
  options: {
    maestroId?: string;
    requestedTool?: string;
    adaptiveDifficultyMode?: string | null;
  },
): Promise<string> {
  try {
    const maestro = options.maestroId
      ? getMaestroById(options.maestroId)
      : undefined;
    const pragmatic =
      options.requestedTool === "summary" ||
      options.requestedTool === "homework" ||
      options.requestedTool === "pdf" ||
      options.requestedTool === "webcam" ||
      options.requestedTool === "study-kit";

    const adaptiveContext = await getAdaptiveContextForUser(userId, {
      subject: maestro?.subject,
      baselineDifficulty: 3,
      pragmatic,
      modeOverride: options.adaptiveDifficultyMode as
        | "manual"
        | "guided"
        | "balanced"
        | "automatic"
        | undefined,
    });
    const adaptiveInstruction = buildAdaptiveInstruction(adaptiveContext);
    return `${systemPrompt}\n\n${adaptiveInstruction}`;
  } catch (error) {
    logger.warn("Failed to load adaptive difficulty context", {
      error: String(error),
    });
    return systemPrompt;
  }
}

/**
 * Build all contexts for a chat request
 */
export async function buildAllContexts(
  options: ContextOptions,
): Promise<ContextResult> {
  let enhancedPrompt = options.systemPrompt;
  let hasMemory = false;
  let hasToolContext = false;
  let hasRAG = false;
  let ragResultsForTransparency: Array<{
    content: string;
    similarity: number;
    sourceType?: string;
  }> = [];

  // Language instruction (FIRST - most important)
  const language = options.language || "it";
  const languageInstruction = getLanguageInstruction(
    language,
    options.maestroId,
  );
  enhancedPrompt = `${enhancedPrompt}\n\n${languageInstruction}`;
  logger.debug("Language instruction injected", {
    language,
    maestroId: options.maestroId,
  });

  // Memory context
  if (options.enableMemory && options.userId && options.maestroId) {
    const memoryResult = await injectMemoryContext(
      enhancedPrompt,
      options.userId,
      options.maestroId,
    );
    enhancedPrompt = memoryResult.enhancedPrompt;
    hasMemory = memoryResult.hasMemory;
  }

  // Tool context
  if (options.userId && options.conversationId) {
    const toolResult = await injectToolContextData(
      enhancedPrompt,
      options.userId,
      options.conversationId,
    );
    enhancedPrompt = toolResult.enhancedPrompt;
    hasToolContext = toolResult.hasToolContext;
  }

  // RAG context
  if (options.userId && options.lastUserMessage) {
    const ragResult = await injectRAGContext(
      enhancedPrompt,
      options.userId,
      options.lastUserMessage,
    );
    enhancedPrompt = ragResult.enhancedPrompt;
    hasRAG = ragResult.hasRAG;
    ragResultsForTransparency = ragResult.ragResults;
  }

  // Adaptive difficulty context
  if (options.userId) {
    enhancedPrompt = await injectAdaptiveContext(
      enhancedPrompt,
      options.userId,
      {
        maestroId: options.maestroId,
        requestedTool: options.requestedTool,
        adaptiveDifficultyMode: options.adaptiveDifficultyMode,
      },
    );
  }

  return {
    enhancedPrompt,
    hasMemory,
    hasToolContext,
    hasRAG,
    ragResultsForTransparency,
  };
}
