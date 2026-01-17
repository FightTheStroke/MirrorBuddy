/**
 * Streaming Chat Helpers
 * Business logic for streaming endpoint
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { filterInput } from '@/lib/safety';
import { loadPreviousContext } from '@/lib/conversation/memory-loader';
import { enhanceSystemPrompt } from '@/lib/conversation/prompt-enhancer';
import { findSimilarMaterials, findRelatedConcepts } from '@/lib/rag/retrieval-service';
import type { AIProvider } from '@/lib/ai/providers';

import type { ChatRequest } from '../types';

// Import and re-export budget tracker for backwards compatibility
import { TOKEN_COST_PER_UNIT, estimateTokens, MidStreamBudgetTracker } from './budget-tracker';
export { TOKEN_COST_PER_UNIT, estimateTokens, MidStreamBudgetTracker };

/**
 * User settings for budget and provider
 */
export interface UserSettings {
  provider: string;
  budgetLimit: number;
  totalSpent: number;
}

/**
 * Context preparation result
 */
export interface PreparedContext {
  userId: string | undefined;
  userSettings: UserSettings | null;
  providerPreference: AIProvider | 'auto' | undefined;
  enhancedSystemPrompt: string;
  safetyBlock: { blocked: true; response: string } | null;
  budgetExceeded: boolean;
}

/**
 * Get user ID from cookie
 */
export async function getUserId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('mirrorbuddy-user-id')?.value;
}

/**
 * Load user settings and check budget
 */
export async function loadUserSettings(
  userId: string
): Promise<{ settings: UserSettings | null; providerPreference: AIProvider | 'auto' | undefined }> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { provider: true, budgetLimit: true, totalSpent: true },
    });

    let providerPreference: AIProvider | 'auto' | undefined;
    if (settings?.provider && (settings.provider === 'azure' || settings.provider === 'ollama')) {
      providerPreference = settings.provider;
    }

    return { settings, providerPreference };
  } catch (e) {
    logger.debug('Failed to load settings', { error: String(e) });
    return { settings: null, providerPreference: undefined };
  }
}

/**
 * Enhance system prompt with memory and RAG context
 */
export async function enhancePromptWithContext(
  basePrompt: string,
  userId: string | undefined,
  maestroId: string | undefined,
  messages: ChatRequest['messages'],
  enableMemory: boolean
): Promise<string> {
  let enhanced = basePrompt;

  // Inject conversation memory if enabled
  if (enableMemory && userId && maestroId) {
    try {
      const memory = await loadPreviousContext(userId, maestroId);
      if (memory.recentSummary || memory.keyFacts.length > 0) {
        enhanced = enhanceSystemPrompt({
          basePrompt: enhanced,
          memory,
          safetyOptions: { role: 'maestro' },
        });
      }
    } catch (memoryError) {
      logger.warn('Failed to load memory', { error: String(memoryError) });
    }
  }

  // RAG context injection - search materials and study kits
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (userId && lastUserMessage) {
    try {
      // Search in materials (generated content)
      const relevantMaterials = await findSimilarMaterials({
        userId,
        query: lastUserMessage.content,
        limit: 3,
        minSimilarity: 0.6,
      });

      // Search in study kits (original document content)
      const relatedStudyKits = await findRelatedConcepts({
        userId,
        query: lastUserMessage.content,
        limit: 3,
        minSimilarity: 0.5,
        includeFlashcards: false,
        includeStudykits: true,
      });

      const allResults = [...relevantMaterials, ...relatedStudyKits];

      if (allResults.length > 0) {
        const ragContext = allResults.map(m => `- ${m.content}`).join('\n');
        enhanced = `${enhanced}\n\n[Materiali rilevanti]\n${ragContext}`;
      }
    } catch (ragError) {
      logger.warn('Failed to load RAG context', { error: String(ragError) });
    }
  }

  return enhanced;
}

/**
 * Check input safety and return block response if needed
 */
export function checkInputSafety(
  content: string
): { blocked: true; response: string } | null {
  const filterResult = filterInput(content);
  if (!filterResult.safe && filterResult.action === 'block') {
    return { blocked: true, response: filterResult.suggestedResponse || 'Content blocked.' };
  }
  return null;
}

/**
 * Update user budget after streaming
 */
export async function updateBudget(
  userId: string,
  totalTokens: number
): Promise<void> {
  try {
    const estimatedCost = totalTokens * TOKEN_COST_PER_UNIT;
    await prisma.settings.update({
      where: { userId },
      data: { totalSpent: { increment: estimatedCost } },
    });
  } catch (e) {
    logger.warn('Failed to update budget', { error: String(e) });
  }
}

/**
 * Create SSE response from async generator
 */
export function createSSEResponse(generator: () => AsyncGenerator<string>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generator()) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
