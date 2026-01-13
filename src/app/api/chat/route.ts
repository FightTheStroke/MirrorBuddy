/**
 * Chat API Route Handler
 * Supports: Azure OpenAI, Ollama (local)
 * SECURITY: Input/output filtering for child safety (Issue #30)
 * FEATURE: Function calling for tool execution (Issue #39)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { chatCompletion, getActiveProvider, type AIProvider } from '@/lib/ai/providers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { filterInput, sanitizeOutput } from '@/lib/safety';
import { CHAT_TOOL_DEFINITIONS } from '@/types/tools';
import { executeToolCall } from '@/lib/tools/tool-executor';
import { loadPreviousContext } from '@/lib/conversation/memory-loader';
import { enhanceSystemPrompt } from '@/lib/conversation/prompt-enhancer';
import { findSimilarMaterials, findRelatedConcepts } from '@/lib/rag/retrieval-service';
import { saveTool } from '@/lib/tools/tool-persistence';
import { functionNameToToolType } from '@/types/tools';
import { isSignedCookie, verifyCookieValue } from '@/lib/auth/cookie-signing';
// Import handlers to register them
import '@/lib/tools/handlers';

import { ChatRequest } from './types';
import { TOOL_CONTEXT } from './constants';
import { getDemoContext } from './helpers';
import { TOKEN_COST_PER_UNIT } from './stream/helpers';

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/chat' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const { messages, systemPrompt, maestroId, enableTools = true, enableMemory = true, requestedTool } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get userId from cookie for memory injection and provider preference
    // Extract userId from signed cookies (or legacy unsigned cookies)
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get('mirrorbuddy-user-id')?.value;
    let userId: string | undefined;

    if (cookieValue) {
      if (isSignedCookie(cookieValue)) {
        const verification = verifyCookieValue(cookieValue);
        if (verification.valid) {
          userId = verification.value;
        } else {
          logger.warn('Invalid signed cookie in /api/chat', {
            error: verification.error,
          });
        }
      } else {
        // Legacy unsigned cookie
        userId = cookieValue;
      }
    }

    // #87: Get user's provider preference and budget from settings
    let providerPreference: AIProvider | 'auto' | undefined;
    let userSettings: { provider: string; budgetLimit: number; totalSpent: number } | null = null;
    if (userId) {
      try {
        userSettings = await prisma.settings.findUnique({
          where: { userId },
          select: { provider: true, budgetLimit: true, totalSpent: true },
        });
        if (userSettings?.provider && (userSettings.provider === 'azure' || userSettings.provider === 'ollama')) {
          providerPreference = userSettings.provider;
        }

        // Check budget limit (WAVE 3: Token budget enforcement)
        if (userSettings && userSettings.totalSpent >= userSettings.budgetLimit) {
          logger.warn('Budget limit exceeded', {
            userId,
            totalSpent: userSettings.totalSpent,
            budgetLimit: userSettings.budgetLimit,
          });
          return NextResponse.json(
            {
              error: 'Budget limit exceeded',
              message: `Hai raggiunto il limite di budget di $${userSettings.budgetLimit.toFixed(2)}. Puoi aumentarlo nelle impostazioni.`,
              totalSpent: userSettings.totalSpent,
              budgetLimit: userSettings.budgetLimit,
              settingsUrl: '/settings',
            },
            { status: 402 }
          );
        }

        // Budget warning threshold (80% usage)
        const BUDGET_WARNING_THRESHOLD = 0.8;
        if (userSettings && userSettings.budgetLimit > 0) {
          const usageRatio = userSettings.totalSpent / userSettings.budgetLimit;
          if (usageRatio >= BUDGET_WARNING_THRESHOLD && usageRatio < 1) {
            logger.info('Budget warning threshold reached', {
              userId,
              totalSpent: userSettings.totalSpent,
              budgetLimit: userSettings.budgetLimit,
              usagePercent: Math.round(usageRatio * 100),
            });
          }
        }
      } catch (e) {
        // Settings lookup failure should not block chat
        logger.debug('Failed to load provider preference', { error: String(e) });
      }
    }

    // Build enhanced system prompt with tool context
    let enhancedSystemPrompt = systemPrompt;
    if (requestedTool) {
      // Use dynamic context for demo (includes maestro's teaching style)
      const toolContext = requestedTool === 'demo' ? getDemoContext(maestroId) : TOOL_CONTEXT[requestedTool];

      if (toolContext) {
        enhancedSystemPrompt = `${systemPrompt}\n\n${toolContext}`;
        logger.debug('Tool context injected', { requestedTool, maestroId });
      }
    }

    // Inject conversation memory if enabled and user is authenticated (ADR 0021)
    let hasMemory = false;
    if (enableMemory && userId && maestroId) {
      try {
        const memory = await loadPreviousContext(userId, maestroId);
        if (memory.recentSummary || memory.keyFacts.length > 0) {
          enhancedSystemPrompt = enhanceSystemPrompt({
            basePrompt: enhancedSystemPrompt,
            memory,
            safetyOptions: {
              role: 'maestro',
            },
          });
          hasMemory = true;
          logger.debug('Conversation memory injected', {
            maestroId,
            keyFactCount: memory.keyFacts.length,
            hasSummary: !!memory.recentSummary,
          });
        }
      } catch (memoryError) {
        // Memory loading failure should not block the chat
        logger.warn('Failed to load conversation memory', {
          userId,
          maestroId,
          error: String(memoryError),
        });
      }
    }

    // Get last user message for safety filtering and RAG
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();

    // Wave 4: RAG context injection - find relevant materials and study kits
    let hasRAG = false;
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
          const ragContext = allResults
            .map((m) => `- ${m.content}`)
            .join('\n');
          enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n[Materiali rilevanti dello studente]\n${ragContext}`;
          hasRAG = true;
          logger.debug('RAG context injected', {
            userId,
            materialCount: relevantMaterials.length,
            studyKitCount: relatedStudyKits.length,
            topSimilarity: allResults[0]?.similarity,
          });
        }
      } catch (ragError) {
        // RAG failure should not block the chat
        logger.warn('Failed to load RAG context', {
          userId,
          error: String(ragError),
        });
      }
    }

    // SECURITY: Filter the last user message for safety (Issue #30)
    if (lastUserMessage) {
      const filterResult = filterInput(lastUserMessage.content);
      if (!filterResult.safe && filterResult.action === 'block') {
        logger.warn('Content blocked by safety filter', {
          clientId,
          category: filterResult.category,
          severity: filterResult.severity,
        });
        return NextResponse.json({
          content: filterResult.suggestedResponse,
          provider: 'safety_filter',
          model: 'content-filter',
          blocked: true,
          category: filterResult.category,
        });
      }
    }

    // #87: Get active provider info for response (pass preference for consistency)
    const providerConfig = getActiveProvider(providerPreference);

    try {
      // Debug logging for tool context
      if (requestedTool) {
        logger.info('Tool mode active', {
          requestedTool,
          toolsEnabled: enableTools,
          hasToolContext: !!TOOL_CONTEXT[requestedTool],
          maestroId,
        });
      }

      // Force tool call when a specific tool is requested
      const toolChoiceForRequest = (() => {
        if (!enableTools) return 'none' as const;
        if (requestedTool) {
          // Map requestedTool to function name
          const toolFunctionMap: Record<string, string> = {
            mindmap: 'create_mindmap',
            quiz: 'create_quiz',
            flashcard: 'create_flashcards',
            demo: 'create_demo',
            summary: 'create_summary',
            search: 'web_search',
          };
          const functionName = toolFunctionMap[requestedTool];
          if (functionName) {
            return { type: 'function' as const, function: { name: functionName } };
          }
        }
        return 'auto' as const;
      })();

      const result = await chatCompletion(messages, enhancedSystemPrompt, {
        tools: enableTools ? ([...CHAT_TOOL_DEFINITIONS] as typeof CHAT_TOOL_DEFINITIONS[number][]) : undefined,
        tool_choice: toolChoiceForRequest,
        providerPreference,
      });

      // Debug: Log if we got tool calls back
      logger.debug('Chat response', {
        hasToolCalls: !!(result.tool_calls && result.tool_calls.length > 0),
        toolCallCount: result.tool_calls?.length || 0,
        toolCallNames: result.tool_calls?.map(tc => tc.function.name) || [],
        contentLength: result.content?.length || 0,
      });

      // Handle tool calls if present
      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolCallRefs = [];

        for (const toolCall of result.tool_calls) {
          const toolType = functionNameToToolType(toolCall.function.name);

          try {
            const args = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeToolCall(
              toolCall.function.name,
              args,
              { maestroId, conversationId: undefined, userId }
            );

            // Material ID to use in toolCallRef (from saved material or fallback to tool result)
            let materialId: string | undefined;

            if (toolResult.success && toolResult.data && userId) {
              // Save tool result to Material table (content duplication reduction)
              // Skip saving for unauthenticated users to avoid database constraint violations
              try {
                const savedMaterial = await saveTool({
                  userId,
                  type: toolType,
                  title: args.title || args.topic || `${toolType} tool`,
                  content: toolResult.data as Record<string, unknown>,
                  maestroId,
                  topic: args.topic,
                  sourceToolId: typeof args.sourceToolId === 'string' ? args.sourceToolId : undefined,
                });
                // Use the saved material's toolId (fixes ID mismatch bug)
                materialId = savedMaterial.toolId;
              } catch (saveError) {
                logger.warn('Failed to save tool to Material table', {
                  toolType,
                  error: String(saveError),
                });
              }
            }

            // Return lightweight ToolCallRef (without result.data)
            toolCallRefs.push({
              id: materialId || toolResult.toolId || toolCall.id,
              type: toolType,
              name: toolCall.function.name,
              status: toolResult.success ? 'completed' : 'error',
              error: toolResult.error,
              materialId,
            });
          } catch (toolError) {
            logger.error('Tool execution failed', {
              toolCall: toolCall.function.name,
              error: String(toolError),
            });

            toolCallRefs.push({
              id: toolCall.id,
              type: toolType,
              name: toolCall.function.name,
              status: 'error',
              error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
            });
          }
        }

        // Return response with lightweight tool call references
        return NextResponse.json({
          content: result.content || '',
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          maestroId,
          toolCalls: toolCallRefs,
          hasTools: true,
          hasMemory,
          hasRAG,
        });
      }

      // SECURITY: Sanitize AI output before returning (Issue #30)
      const sanitized = sanitizeOutput(result.content);
      if (sanitized.modified) {
        logger.warn('Output sanitized', {
          clientId,
          issuesFound: sanitized.issuesFound,
          categories: sanitized.categories,
        });
      }

      // Update budget tracking if usage data is available (WAVE 3: Token budget enforcement)
      if (userId && userSettings && result.usage) {
        try {
          // Use shared constant for token cost (see stream/helpers.ts for pricing details)
          const estimatedCost = (result.usage.total_tokens || 0) * TOKEN_COST_PER_UNIT;
          await prisma.settings.update({
            where: { userId },
            data: {
              totalSpent: {
                increment: estimatedCost,
              },
            },
          });
          logger.debug('Budget updated', {
            userId,
            tokensUsed: result.usage.total_tokens,
            estimatedCost,
            newTotal: userSettings.totalSpent + estimatedCost,
          });
        } catch (e) {
          // Budget update failure should not block the response
          logger.warn('Failed to update budget', { userId, error: String(e) });
        }
      }

      return NextResponse.json({
        content: sanitized.text,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        hasMemory,
        hasRAG,
        maestroId,
        sanitized: sanitized.modified,
      });
    } catch (providerError) {
      // Provider-specific error handling
      const errorMessage = providerError instanceof Error ? providerError.message : 'Unknown provider error';

      // Check if it's an Ollama availability issue
      if (errorMessage.includes('Ollama is not running')) {
        return NextResponse.json(
          {
            error: 'No AI provider available',
            message: errorMessage,
            help: 'Configure Azure OpenAI or start Ollama: ollama serve && ollama pull llama3.2',
            provider: providerConfig?.provider ?? 'none',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Chat request failed',
          message: errorMessage,
          provider: providerConfig?.provider ?? 'unknown',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Chat API error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check provider status
export async function GET() {
  const provider = getActiveProvider();

  if (!provider) {
    return NextResponse.json({
      available: false,
      provider: null,
      message: 'No AI provider configured',
    });
  }

  return NextResponse.json({
    available: true,
    provider: provider.provider,
    model: provider.model,
  });
}
