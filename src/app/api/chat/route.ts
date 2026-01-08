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
import { getMaestroById } from '@/data';
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
// These instructions guide AI to prioritize tool calls when the user specifies a topic
const TOOL_CONTEXT: Record<string, string> = {
  mindmap: `
## MODALITÀ MAPPA MENTALE - GERARCHIA OBBLIGATORIA

SBAGLIATO (mappa piatta - NON fare così):
nodes: [{"id":"1","label":"A"},{"id":"2","label":"B"},{"id":"3","label":"C"}]

CORRETTO (mappa gerarchica):
{
  "title": "La Fotosintesi",
  "nodes": [
    {"id":"1","label":"Fase Luminosa"},
    {"id":"2","label":"Clorofilla","parentId":"1"},
    {"id":"3","label":"ATP","parentId":"1"},
    {"id":"4","label":"Fase Oscura"},
    {"id":"5","label":"Ciclo di Calvin","parentId":"4"},
    {"id":"6","label":"Glucosio","parentId":"5"}
  ]
}

REGOLE OBBLIGATORIE:
1. Nodi SENZA parentId = rami principali (max 3-5)
2. Nodi CON parentId = sotto-nodi (DEVONO avere parentId!)
3. Ogni ramo principale DEVE avere almeno 2 figli
4. MAI fare mappe piatte dove tutti i nodi sono senza parentId

Se lo studente non ha indicato un argomento, chiedi: "Di cosa vuoi fare la mappa?"`,

  quiz: `
## MODALITÀ QUIZ

Hai a disposizione il tool "create_quiz" per creare quiz interattivi.

Quando lo studente indica un argomento:
1. Usa direttamente il tool create_quiz
2. Il tool genererà automaticamente il quiz interattivo

ESEMPI:
- "rivoluzione francese" → usa create_quiz(topic:"Rivoluzione Francese", questions:[...])
- "frazioni" → usa create_quiz(topic:"Le Frazioni", questions:[...])

Se lo studente non ha indicato un argomento, chiedi: "Su cosa vuoi fare il quiz?"`,

  flashcard: `
## MODALITÀ FLASHCARD

Hai a disposizione il tool "create_flashcards" per creare set di flashcard.

Quando lo studente indica un argomento:
1. Usa direttamente il tool create_flashcards
2. Il tool genererà automaticamente le carte

ESEMPI:
- "verbi irregolari" → usa create_flashcards(topic:"Verbi Irregolari Inglesi", cards:[...])
- "capitali europee" → usa create_flashcards(topic:"Capitali Europee", cards:[...])

Se lo studente non ha indicato un argomento, chiedi: "Su cosa vuoi le flashcard?"`,

  demo: '', // Dynamic - built in getDemoContext() below

  summary: `
## MODALITÀ RIASSUNTO

Hai a disposizione il tool "create_summary" per creare riassunti strutturati.

Quando lo studente indica un argomento:
1. Usa direttamente il tool create_summary
2. Il tool genererà automaticamente il riassunto

ESEMPI:
- "prima guerra mondiale" → usa create_summary(topic:"Prima Guerra Mondiale", sections:[...])
- "fotosintesi" → usa create_summary(topic:"La Fotosintesi", sections:[...])

Se lo studente non ha indicato un argomento, chiedi: "Cosa vuoi riassumere?"`,
};

/**
 * Build dynamic demo context based on maestro's teaching style
 * Includes CAPABILITY PALETTE so maestro knows what's technically possible
 */
function getDemoContext(maestroId?: string): string {
  const maestro = maestroId ? getMaestroById(maestroId) : null;
  const teachingStyle = maestro?.teachingStyle || 'Interattivo e coinvolgente';
  const maestroName = maestro?.name || 'Maestro';
  
  return `
## MODALITÀ DEMO INTERATTIVA

Tu sei ${maestroName}. Il tuo stile: "${teachingStyle}"

### 🎨 PALETTE DI CAPACITÀ - Cosa puoi chiedere:

**ELEMENTI VISIVI disponibili:**
- Blocchi/forme colorate (quadrati, cerchi, rettangoli)
- Griglia di elementi (es: array per moltiplicazione)
- Linea del tempo (timeline orizzontale navigabile)
- Mappa/canvas (area disegnabile)
- Grafici (barre, linee, torta)
- Personaggi/icone (figure semplici animate)
- Testo grande animato (numeri, parole)
- Particelle (sfondo decorativo)

**INTERAZIONI possibili:**
- Slider (l'utente trascina per cambiare un valore)
- Click su elementi (seleziona, attiva, rivela)
- Drag & drop (trascina oggetti)
- Hover (mostra info al passaggio mouse)
- Input numerico (inserisci valori)
- Bottoni (esegui azione)
- Navigazione (avanti/indietro, zoom)

**ANIMAZIONI disponibili:**
- Elementi che appaiono uno per uno
- Movimento fluido (oggetti che si spostano)
- Crescita/riduzione (scale)
- Rotazione
- Pulsazione (pulse)
- Cambio colore graduale
- Esplosione di particelle/confetti (celebrazione)
- Transizioni tra stati

**FEEDBACK possibili:**
- Suono visivo (flash, shake quando corretto/sbagliato)
- Contatore animato (numeri che scorrono)
- Progress bar
- Stelle/punti che appaiono
- Messaggio di successo

### 🎯 COME DESCRIVERE LA TUA DEMO:

1. **TITOLO**: Nome accattivante
2. **CONCETTO**: Cosa insegna (es: "moltiplicazione", "ciclo dell'acqua")
3. **VISUALIZZAZIONE**: Descrivi COME vuoi che appaia usando gli elementi dalla palette
   - "Voglio una GRIGLIA di BLOCCHI colorati, 3 righe per 4 colonne"
   - "Voglio una TIMELINE con 5 PUNTI cliccabili"
   - "Voglio PARTICELLE che si muovono e si raggruppano"
4. **INTERAZIONE**: Cosa può fare lo studente usando le interazioni dalla palette
   - "Lo studente usa uno SLIDER per cambiare il numero di righe"
   - "Lo studente CLICCA sui blocchi per colorarli"
   - "Lo studente TRASCINA i personaggi sulla mappa"
5. **WOW FACTOR**: Cosa rende memorabile
   - "Quando trova la risposta, CONFETTI colorati!"
   - "I numeri CRESCONO con animazione contatore"

### 💡 ESEMPI PER IL TUO STILE (${maestroName}):

${getStyleExamples(maestroName)}

### ⚠️ IMPORTANTE:
- Usa termini dalla PALETTE sopra così posso capire cosa vuoi
- Sii specifico: "5 blocchi in fila" è meglio di "alcuni blocchi"
- Indica i colori se importanti: "blocchi BLU e ROSSI"
- Descrivi l'animazione: "appaiono UNO PER UNO" vs "appaiono TUTTI INSIEME"

Se lo studente non ha indicato un argomento, chiedi: "Cosa vuoi esplorare insieme?"`;
}

/**
 * Get style-specific examples based on maestro
 */
function getStyleExamples(maestroName: string | undefined): string {
  switch (maestroName) {
    case 'Euclide':
      return `- "GRIGLIA di blocchi che formano un RETTANGOLO. SLIDER per righe e colonne. L'AREA appare come NUMERO GRANDE animato. Quando cambi i valori, i blocchi APPAIONO UNO PER UNO."
- "CERCHIO che si divide in SPICCHI (frazioni). CLICK su ogni spicchio per COLORARLO. Il numero di spicchi colorati / totale appare sopra."`;
    
    case 'Feynman':
      return `- "PARTICELLE colorate che RIMBALZANO in un contenitore. SLIDER per la TEMPERATURA. Più caldo = movimento più VELOCE e CAOTICO. I colori cambiano da BLU (freddo) a ROSSO (caldo)!"
- "PALLONCINI che si MOLTIPLICANO! Clicca il bottone e ogni palloncino si DUPLICA con un POP animato. Conta i palloncini = moltiplicazione!"`;
    
    case 'Erodoto':
      return `- "TIMELINE orizzontale con 5 PUNTI. HOVER su ogni punto per vedere l'evento. CLICK per espandere la storia completa. PERSONAGGIO animato che cammina lungo la timeline."
- "MAPPA antica con CONFINI che CAMBIANO. SLIDER per l'anno (500 AC → 2000 DC). I territori cambiano COLORE gradualmente. CLICK su una regione per info."`;
    
    case 'Darwin':
      return `- "ALBERO della vita che CRESCE. Ogni RAMO è una specie. CLICK su un ramo per vedere le caratteristiche. Le specie APPAIONO una dopo l'altra seguendo l'evoluzione."
- "Ambiente con CREATURE che cambiano. SLIDER per il tempo (milioni di anni). Le creature si TRASFORMANO gradualmente. I più adatti BRILLANO."`;
    
    case 'Curie':
      return `- "ATOMI che VIBRANO. Alcuni sono STABILI (verdi), altri RADIOATTIVI (brillano). CLICK su un atomo radioattivo per vedere il DECADIMENTO animato. CONTATORE Geiger che fa TIC-TIC."
- "MOLECOLE che si COMBINANO. DRAG molecole insieme. Se la reazione funziona = FLASH di luce ed ENERGIA rilasciata visibile!"`;
    
    case 'Leonardo':
      return `- "MACCHINA con INGRANAGGI. CLICK per farla partire. Gli ingranaggi RUOTANO collegati. Cambia la VELOCITÀ di uno e vedi gli effetti sugli altri."
- "Foglio da DISEGNO con PROSPETTIVA. TRASCINA il punto di fuga. Le linee guida si AGGIORNANO. POSIZIONA oggetti e vedi come cambiano dimensioni."`;
    
    default:
      return `- "GRIGLIA di elementi colorati. SLIDER per cambiare quantità. Gli elementi APPAIONO con animazione. CLICK per interagire."
- "DIAGRAMMA interattivo. HOVER per info. CLICK per espandere. Transizioni FLUIDE tra stati."
- "TIMELINE navigabile. DRAG per scorrere. PUNTI cliccabili con POPUP informativi."`;
  }
}

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
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

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
            // Continue with request but add warning header for client to handle
            // Client can show a warning toast based on this header
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
      const toolContext = requestedTool === 'demo' 
        ? getDemoContext(maestroId) 
        : TOOL_CONTEXT[requestedTool];
      
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
          };
          const functionName = toolFunctionMap[requestedTool];
          if (functionName) {
            // Force the specific tool to be called
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
