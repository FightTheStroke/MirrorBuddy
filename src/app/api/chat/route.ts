// ============================================================================
// API ROUTE: Chat completions
// Supports: Azure OpenAI, Ollama (local)
// NEVER: Direct OpenAI API, Anthropic
// SECURITY: Input/output filtering for child safety (Issue #30)
// FEATURE: Function calling for tool execution (Issue #39)
// ============================================================================

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
// Import handlers to register them
import '@/lib/tools/handlers';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
  enableTools?: boolean; // Optional: enable tool calling (default: true)
  enableMemory?: boolean; // Optional: enable conversation memory (default: true)
  requestedTool?: 'mindmap' | 'quiz' | 'flashcard' | 'demo' | 'summary'; // Tool context injection
}

// Tool context to inject into system prompt (Phase 5: Chat API Enhancement)
// CRITICAL: These instructions FORCE tool calls when user specifies a topic
const TOOL_CONTEXT: Record<string, string> = {
  mindmap: `
## ISTRUZIONI CRITICHE - MODALITÀ MAPPA MENTALE

HAI ACCESSO AL TOOL "create_mindmap". DEVI USARLO.

REGOLA ASSOLUTA: Quando lo studente menziona un argomento:
1. NON rispondere con testo
2. CHIAMA SUBITO create_mindmap
3. IL TOOL CREERÀ LA MAPPA, TU DEVI SOLO CHIAMARLO

STRUTTURA GERARCHICA OBBLIGATORIA - ESEMPIO CORRETTO:
{
  "title": "La Fotosintesi",
  "nodes": [
    { "id": "1", "label": "Fase Luminosa", "parentId": null },
    { "id": "2", "label": "Clorofilla", "parentId": "1" },
    { "id": "3", "label": "Assorbimento Luce", "parentId": "1" },
    { "id": "4", "label": "Fase Oscura", "parentId": null },
    { "id": "5", "label": "Ciclo di Calvin", "parentId": "4" },
    { "id": "6", "label": "Fissazione CO2", "parentId": "5" },
    { "id": "7", "label": "Fattori Ambientali", "parentId": null },
    { "id": "8", "label": "Luce Solare", "parentId": "7" },
    { "id": "9", "label": "Temperatura", "parentId": "7" }
  ]
}

REGOLE IMPERATIVE PER LA GERARCHIA:
1. parentId: null = nodo di PRIMO livello (ramo principale dal centro)
2. parentId: "X" = nodo FIGLIO del nodo con id "X"
3. DEVI creare ALMENO 3 livelli di profondità
4. Ogni nodo di primo livello DEVE avere 2-4 figli
5. MAI mettere tutti i nodi con parentId: null (mappa PIATTA = ERRORE)

SE generi una mappa con tutti parentId: null, HAI SBAGLIATO.

SE e SOLO SE lo studente NON ha ancora dato un argomento, chiedi: "Di cosa vuoi fare la mappa?"`,

  quiz: `
## ISTRUZIONI CRITICHE - MODALITÀ QUIZ

HAI ACCESSO AL TOOL "create_quiz". DEVI USARLO.

REGOLA ASSOLUTA: Quando lo studente menziona un argomento:
1. NON rispondere con testo
2. CHIAMA SUBITO create_quiz
3. IL TOOL CREERÀ IL QUIZ, TU DEVI SOLO CHIAMARLO

ESEMPI - quando lo studente dice:
- "rivoluzione francese" → CHIAMA create_quiz(topic:"Rivoluzione Francese", questions:[...])
- "frazioni" → CHIAMA create_quiz(topic:"Le Frazioni", questions:[...])

SE e SOLO SE lo studente NON ha ancora dato un argomento, chiedi: "Su cosa vuoi fare il quiz?"`,

  flashcard: `
## ISTRUZIONI CRITICHE - MODALITÀ FLASHCARD

HAI ACCESSO AL TOOL "create_flashcards". DEVI USARLO.

REGOLA ASSOLUTA: Quando lo studente menziona un argomento:
1. NON rispondere con testo
2. CHIAMA SUBITO create_flashcards
3. IL TOOL CREERÀ LE CARTE, TU DEVI SOLO CHIAMARLO

ESEMPI - quando lo studente dice:
- "verbi irregolari" → CHIAMA create_flashcards(topic:"Verbi Irregolari Inglesi", cards:[...])
- "capitali europee" → CHIAMA create_flashcards(topic:"Capitali Europee", cards:[...])

SE e SOLO SE lo studente NON ha ancora dato un argomento, chiedi: "Su cosa vuoi le flashcard?"`,

  demo: `
## ISTRUZIONI CRITICHE - MODALITÀ DEMO INTERATTIVA

HAI ACCESSO AL TOOL "create_demo". DEVI USARLO.

REGOLA ASSOLUTA: Quando lo studente menziona un argomento:
1. NON rispondere con testo
2. CHIAMA SUBITO create_demo
3. IL TOOL CREERÀ LA DEMO, TU DEVI SOLO CHIAMARLO

ESEMPI - quando lo studente dice:
- "sistema solare" → CHIAMA create_demo(title:"Sistema Solare", html:"<canvas>...", js:"animation code...")
- "onde" → CHIAMA create_demo(title:"Onde Meccaniche", html:"...", js:"wave simulation...")

SE e SOLO SE lo studente NON ha ancora dato un argomento, chiedi: "Cosa vuoi visualizzare nella demo?"`,

  summary: `
## ISTRUZIONI CRITICHE - MODALITÀ RIASSUNTO

HAI ACCESSO AL TOOL "create_summary". DEVI USARLO.

REGOLA ASSOLUTA: Quando lo studente menziona un argomento:
1. NON rispondere con testo
2. CHIAMA SUBITO create_summary
3. IL TOOL CREERÀ IL RIASSUNTO, TU DEVI SOLO CHIAMARLO

ESEMPI - quando lo studente dice:
- "prima guerra mondiale" → CHIAMA create_summary(topic:"Prima Guerra Mondiale", sections:[...])
- "fotosintesi" → CHIAMA create_summary(topic:"La Fotosintesi", sections:[...])

SE e SOLO SE lo studente NON ha ancora dato un argomento, chiedi: "Cosa vuoi riassumere?"`,
};

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
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

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
              message: `You have reached your budget limit of $${userSettings.budgetLimit.toFixed(2)}. Please increase your budget in settings.`,
              totalSpent: userSettings.totalSpent,
              budgetLimit: userSettings.budgetLimit,
            },
            { status: 402 }
          );
        }
      } catch (e) {
        // Settings lookup failure should not block chat
        logger.debug('Failed to load provider preference', { error: String(e) });
      }
    }

    // Build enhanced system prompt with tool context
    let enhancedSystemPrompt = systemPrompt;
    if (requestedTool && TOOL_CONTEXT[requestedTool]) {
      enhancedSystemPrompt = `${systemPrompt}\n\n${TOOL_CONTEXT[requestedTool]}`;
      logger.debug('Tool context injected', { requestedTool, maestroId });
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
        } else {
          // Memory enabled but no previous context found
          logger.info('Memory enabled but no previous context found', {
            userId,
            maestroId,
            enableMemory,
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

    // SECURITY: Filter the last user message for safety (Issue #30)
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
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
      // Call AI with optional tool definitions
      // Cast to mutable array since chatCompletion expects ToolDefinition[]
      // #87: Pass user's provider preference to chatCompletion

      // Debug logging for tool context
      if (requestedTool) {
        logger.info('Tool mode active', {
          requestedTool,
          toolsEnabled: enableTools,
          hasToolContext: !!TOOL_CONTEXT[requestedTool],
          maestroId,
        });
      }

      const result = await chatCompletion(messages, enhancedSystemPrompt, {
        tools: enableTools ? ([...CHAT_TOOL_DEFINITIONS] as typeof CHAT_TOOL_DEFINITIONS[number][]) : undefined,
        tool_choice: enableTools ? 'auto' : 'none',
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
        const toolResults = [];

        for (const toolCall of result.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeToolCall(
              toolCall.function.name,
              args,
              { maestroId, conversationId: undefined, userId }
            );
            // Transform to ToolCall interface format expected by ToolResultDisplay
            // Note: type uses function name (e.g., 'create_mindmap') to match ToolType in types/index.ts
            toolResults.push({
              id: toolResult.toolId || toolCall.id,
              type: toolCall.function.name,
              name: toolCall.function.name,
              arguments: args,
              status: toolResult.success ? 'completed' : 'error',
              result: {
                success: toolResult.success,
                data: toolResult.data,
                error: toolResult.error,
              },
            });
          } catch (toolError) {
            logger.error('Tool execution failed', {
              toolCall: toolCall.function.name,
              error: String(toolError),
            });
            const args = JSON.parse(toolCall.function.arguments || '{}');
            toolResults.push({
              id: toolCall.id,
              type: toolCall.function.name,
              name: toolCall.function.name,
              arguments: args,
              status: 'error',
              result: {
                success: false,
                error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
              },
            });
          }
        }

        // Return response with tool results
        return NextResponse.json({
          content: result.content || '',
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          maestroId,
          toolCalls: toolResults,
          hasTools: true,
          hasMemory,
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
          // Rough cost estimation: $0.000002 per token for GPT-4o (adjust as needed)
          const estimatedCost = (result.usage.total_tokens || 0) * 0.000002;
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
        maestroId,
        sanitized: sanitized.modified,
      });
    } catch (providerError) {
      // Provider-specific error handling
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : 'Unknown provider error';

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
