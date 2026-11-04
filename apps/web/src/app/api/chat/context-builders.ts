/**
 * Chat API context builders
 * Extracts and injects various contexts into system prompts
 */

import { logger } from '@/lib/logger';
import { loadPreviousContext } from '@/lib/conversation/memory-loader';
import { enhanceSystemPrompt } from '@/lib/conversation/prompt-enhancer';
import {
  findSimilarMaterials,
  findRelatedConcepts,
  retrieveMaestroKnowledge,
} from '@/lib/rag/server';
import { buildToolContext } from '@/lib/tools/tool-context-builder';
import { getMaestroById } from '@/data/maestri';
import { buildAdaptiveInstruction } from '@/lib/education';
import { getAdaptiveContextForUser } from '@/lib/education/server';
import { getLanguageInstruction } from '@/lib/i18n/language-instructions';
import { resolveQueryEmbedding } from './query-embedding';
import { loadBatchedChatRetrieval, type RAGLoad } from './rag-context';
import type { SupportedLanguage } from './types';

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
  hasAttachments?: boolean;
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
        safetyOptions: { role: 'maestro', characterId: maestroId },
      });
      logger.debug('Conversation memory injected', {
        maestroId,
        keyFactCount: memory.keyFacts.length,
        hasSummary: !!memory.recentSummary,
      });
      return { enhancedPrompt: enhanced, hasMemory: true };
    }
  } catch (memoryError) {
    logger.warn('Failed to load conversation memory', {
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
      logger.debug('Tool context injected', {
        conversationId,
        toolCount: toolContext.toolCount,
        types: toolContext.types,
      });
      return { enhancedPrompt: enhanced, hasToolContext: true };
    }
  } catch (toolContextError) {
    logger.warn('Failed to load tool context', {
      userId,
      conversationId,
      error: String(toolContextError),
    });
  }
  return { enhancedPrompt: systemPrompt, hasToolContext: false };
}

type RAGHit = { content: string; similarity: number; sourceType?: string };

/**
 * Start the two student-corpus vector searches together. They are independent,
 * so running them back to back only adds latency (and trips Sentry's N+1 detector).
 * Never rejects: a failure yields null and the prompt stays unchanged.
 */
export async function loadRAGResults(
  userId: string,
  query: string,
  embedding?: number[],
): Promise<RAGLoad> {
  try {
    const [materials, studyKits] = await Promise.all([
      findSimilarMaterials({ userId, query, embedding, limit: 3, minSimilarity: 0.6 }),
      findRelatedConcepts({
        userId,
        query,
        embedding,
        limit: 3,
        minSimilarity: 0.5,
        includeFlashcards: false,
        includeStudykits: true,
      }),
    ]);
    return { materials, studyKits };
  } catch (ragError) {
    logger.warn('Failed to load RAG context', {
      userId,
      error: String(ragError),
    });
    return null;
  }
}

function applyRAGResults(
  systemPrompt: string,
  userId: string,
  loaded: RAGLoad,
): { enhancedPrompt: string; hasRAG: boolean; ragResults: RAGHit[] } {
  if (loaded) {
    const allResults = [...loaded.materials, ...loaded.studyKits];
    if (allResults.length > 0) {
      const ragResults = allResults.map((r) => ({
        content: r.content,
        similarity: r.similarity,
        sourceType: 'material',
      }));
      const ragContext = allResults.map((m) => `- ${m.content}`).join('\n');
      const enhanced = `${systemPrompt}\n\n[Materiali rilevanti dello studente]\n${ragContext}`;
      logger.debug('RAG context injected', {
        userId,
        materialCount: loaded.materials.length,
        studyKitCount: loaded.studyKits.length,
        topSimilarity: allResults[0]?.similarity,
      });
      return { enhancedPrompt: enhanced, hasRAG: true, ragResults };
    }
  }
  return { enhancedPrompt: systemPrompt, hasRAG: false, ragResults: [] };
}

/**
 * Inject RAG context (relevant materials and study kits)
 */
export async function injectRAGContext(
  systemPrompt: string,
  userId: string,
  query: string,
  embedding?: number[],
): Promise<{ enhancedPrompt: string; hasRAG: boolean; ragResults: RAGHit[] }> {
  return applyRAGResults(systemPrompt, userId, await loadRAGResults(userId, query, embedding));
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
    const maestro = options.maestroId ? getMaestroById(options.maestroId) : undefined;
    const pragmatic =
      options.requestedTool === 'summary' ||
      options.requestedTool === 'homework' ||
      options.requestedTool === 'pdf' ||
      options.requestedTool === 'webcam' ||
      options.requestedTool === 'study-kit';

    const adaptiveContext = await getAdaptiveContextForUser(userId, {
      subject: maestro?.subject,
      baselineDifficulty: 3,
      pragmatic,
      modeOverride: options.adaptiveDifficultyMode as
        | 'manual'
        | 'guided'
        | 'balanced'
        | 'automatic'
        | undefined,
    });
    const adaptiveInstruction = buildAdaptiveInstruction(adaptiveContext);
    return `${systemPrompt}\n\n${adaptiveInstruction}`;
  } catch (error) {
    logger.warn('Failed to load adaptive difficulty context', {
      error: String(error),
    });
    return systemPrompt;
  }
}

/**
 * Fetch maestro-specific didactic knowledge via RAG retrieval.
 * Never rejects: a failure yields an empty string.
 */
export async function loadMaestroKnowledge(
  maestroId: string,
  query: string,
  embedding?: number[],
): Promise<string> {
  try {
    return await retrieveMaestroKnowledge(maestroId, query, undefined, embedding);
  } catch (error) {
    logger.warn('Failed to load maestro knowledge', {
      maestroId,
      error: String(error),
    });
    return '';
  }
}

function applyMaestroKnowledge(
  systemPrompt: string,
  maestroId: string,
  knowledge: string,
): { enhancedPrompt: string; hasMaestroKB: boolean } {
  if (knowledge) {
    logger.debug('Maestro knowledge injected', { maestroId });
    return { enhancedPrompt: `${systemPrompt}\n\n${knowledge}`, hasMaestroKB: true };
  }
  return { enhancedPrompt: systemPrompt, hasMaestroKB: false };
}

/**
 * Inject maestro-specific didactic knowledge via RAG retrieval
 */
export async function injectMaestroKnowledgeContext(
  systemPrompt: string,
  maestroId: string,
  query: string,
  embedding?: number[],
): Promise<{ enhancedPrompt: string; hasMaestroKB: boolean }> {
  return applyMaestroKnowledge(
    systemPrompt,
    maestroId,
    await loadMaestroKnowledge(maestroId, query, embedding),
  );
}

/**
 * Build all contexts for a chat request
 */
export async function buildAllContexts(options: ContextOptions): Promise<ContextResult> {
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
  const language = options.language || 'it';
  const languageInstruction = getLanguageInstruction(language, options.maestroId);
  enhancedPrompt = `${enhancedPrompt}\n\n${languageInstruction}`;
  logger.debug('Language instruction injected', {
    language,
    maestroId: options.maestroId,
  });

  // One embedding for the whole request: the maestro knowledge base, the
  // student's materials and their study kits all ask about the same question.
  const queryEmbedding = options.lastUserMessage
    ? await resolveQueryEmbedding(options.lastUserMessage)
    : undefined;

  // Batch the three corpora in one database call, then apply them in prompt order.
  const batchPending = queryEmbedding
    ? loadBatchedChatRetrieval(
        options.hasAttachments ? undefined : options.userId,
        options.maestroId,
        queryEmbedding,
      )
    : undefined;
  const maestroKnowledgePending = batchPending
    ? batchPending.then((loaded) => loaded.maestroKnowledge)
    : options.maestroId && options.lastUserMessage
      ? loadMaestroKnowledge(options.maestroId, options.lastUserMessage)
      : undefined;
  const ragPending = batchPending
    ? batchPending.then((loaded) => loaded.rag)
    : !options.hasAttachments && options.userId && options.lastUserMessage
      ? loadRAGResults(options.userId, options.lastUserMessage)
      : undefined;

  // Memory context
  if (!options.hasAttachments && options.enableMemory && options.userId && options.maestroId) {
    const memoryResult = await injectMemoryContext(
      enhancedPrompt,
      options.userId,
      options.maestroId,
    );
    enhancedPrompt = memoryResult.enhancedPrompt;
    hasMemory = memoryResult.hasMemory;
  }

  // Maestro knowledge context (after memory, before tools)
  if (options.maestroId && maestroKnowledgePending) {
    const maestroKBResult = applyMaestroKnowledge(
      enhancedPrompt,
      options.maestroId,
      await maestroKnowledgePending,
    );
    enhancedPrompt = maestroKBResult.enhancedPrompt;
  }

  // Tool context
  if (!options.hasAttachments && options.userId && options.conversationId) {
    const toolResult = await injectToolContextData(
      enhancedPrompt,
      options.userId,
      options.conversationId,
    );
    enhancedPrompt = toolResult.enhancedPrompt;
    hasToolContext = toolResult.hasToolContext;
  }

  // RAG context
  if (!options.hasAttachments && options.userId && ragPending) {
    const ragResult = applyRAGResults(enhancedPrompt, options.userId, await ragPending);
    enhancedPrompt = ragResult.enhancedPrompt;
    hasRAG = ragResult.hasRAG;
    ragResultsForTransparency = ragResult.ragResults;
  }

  // Adaptive difficulty context
  if (options.userId) {
    enhancedPrompt = await injectAdaptiveContext(enhancedPrompt, options.userId, {
      maestroId: options.maestroId,
      requestedTool: options.requestedTool,
      adaptiveDifficultyMode: options.adaptiveDifficultyMode,
    });
  }

  return {
    enhancedPrompt,
    hasMemory,
    hasToolContext,
    hasRAG,
    ragResultsForTransparency,
  };
}
