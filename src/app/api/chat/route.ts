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
const TOOL_CONTEXT: Record<string, string> = {
  mindmap: `
STAI CREANDO UNA MAPPA MENTALE con lo studente.
Linee guida:
- Fai domande maieutiche per esplorare l'argomento
- Parti dal concetto centrale e espandi in modo organico
- Usa create_mindmap per costruire la mappa incrementalmente
- Ogni risposta dello studente può aggiungere nodi alla mappa
- Mantieni la struttura chiara e gerarchica`,

  quiz: `
STAI CREANDO UN QUIZ con lo studente.

**REGOLA IMPORTANTE:** Prima di creare il quiz, CHIEDI allo studente:
"Preferisci fare il quiz per iscritto (lo vedi sullo schermo) oppure a voce (te lo faccio io)?"

Se sceglie PER ISCRITTO:
- Chiedi prima di che argomento vuole essere interrogato
- Crea domande a scelta multipla chiare e formative
- Usa create_quiz per generare il quiz
- Includi feedback educativo per ogni risposta
- Adatta la difficoltà al livello dello studente

Se sceglie A VOCE (o se siete in una sessione vocale):
- NON usare create_quiz!
- Fai tu le domande una alla volta nella chat
- Elenca le opzioni (A, B, C, D)
- Aspetta la risposta dello studente
- Conferma se è corretta o spiega perché è sbagliata
- Passa alla domanda successiva
- Alla fine dai un resoconto del punteggio`,

  flashcard: `
STAI CREANDO FLASHCARD per lo studente.
Linee guida:
- Identifica i concetti chiave da memorizzare
- Crea carte con domanda/risposta brevi e incisive
- Usa create_flashcards per generare le carte
- Organizza le carte per argomento o difficoltà
- Le flashcard verranno usate con ripetizione spaziata FSRS`,

  demo: `
STAI CREANDO UNA DEMO INTERATTIVA per lo studente.
Linee guida:
- Capisce cosa lo studente vuole visualizzare
- Crea simulazioni semplici ma efficaci
- Usa create_demo per generare la demo HTML/JS
- Mantieni l'interattività intuitiva e accessibile
- Spiega cosa la demo sta mostrando`,

  summary: `
STAI CREANDO UN RIASSUNTO STRUTTURATO con lo studente.
Linee guida:
- Chiedi prima quale argomento vuole riassumere
- Organizza il contenuto in sezioni chiare e logiche
- Usa create_summary per costruire il riassunto
- Includi punti chiave per ogni sezione
- Adatta la lunghezza alle esigenze dello studente (breve/medio/lungo)
- Fai domande per approfondire i punti importanti`,
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

    // #87: Get user's provider preference from settings
    let providerPreference: AIProvider | 'auto' | undefined;
    if (userId) {
      try {
        const settings = await prisma.settings.findUnique({
          where: { userId },
          select: { provider: true },
        });
        if (settings?.provider && (settings.provider === 'azure' || settings.provider === 'ollama')) {
          providerPreference = settings.provider;
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
      const result = await chatCompletion(messages, enhancedSystemPrompt, {
        tools: enableTools ? ([...CHAT_TOOL_DEFINITIONS] as typeof CHAT_TOOL_DEFINITIONS[number][]) : undefined,
        tool_choice: enableTools ? 'auto' : 'none',
        providerPreference,
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
