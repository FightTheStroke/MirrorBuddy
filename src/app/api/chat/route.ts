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
  requestedTool?: 'mindmap' | 'quiz' | 'flashcard' | 'demo' | 'summary' | 'search'; // Tool context injection
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

  search: `
## MODALITÀ RICERCA WEB

Hai a disposizione il tool "web_search" per cercare informazioni sul web.

Quando lo studente vuole fare una ricerca:
1. Usa direttamente il tool web_search
2. Raccomanda fonti affidabili come Wikipedia italiana, Treccani e video YouTube educativi
3. Il tool genererà automaticamente i risultati

ESEMPI:
- "rinascimento italiano" → usa web_search(query:"Rinascimento italiano Wikipedia", type:"educational")
- "energie rinnovabili" → usa web_search(query:"Energie rinnovabili Treccani", type:"educational")
- "fisica quantistica" → usa web_search(query:"Fisica quantistica video educativo YouTube", type:"video")

Se lo studente non ha specificato cosa cercare, chiedi: "Cosa vuoi cercare?"`,

  pdf: `
## MODALITÀ CARICA PDF

Questa modalità permette allo studente di caricare un documento PDF per analizzarlo insieme.

Quando lo studente apre questa modalità:
1. Chiedi cosa vuole caricare o studiare
2. Spiega che può caricare un PDF del libro, appunti, o materiale di studio
3. Guida la conversazione per capire l'obiettivo: riassumere, estrarre concetti chiave, fare domande sul contenuto
4. Quando lo studente è pronto, indica che l'interfaccia di upload apparirà

ESEMPI:
- "voglio studiare il capitolo di storia" → "Perfetto! Carica il PDF del capitolo e lo analizzeremo insieme"
- "ho bisogno di un riassunto" → "Ottimo! Carica il documento e creerò un riassunto strutturato per te"

Se lo studente non ha specificato, chiedi: "Quale documento vuoi analizzare? Che cosa vorresti fare?"`,

  webcam: `
## MODALITÀ FOTOCAMERA

Questa modalità permette allo studente di fotografare qualcosa da analizzare insieme.

Quando lo studente apre questa modalità:
1. Chiedi cosa vuole fotografare
2. Spiega che può fotografare: compiti scritti, esercizi dal libro, esperimenti, disegni, appunti
3. Guida la conversazione per capire l'obiettivo: correggere un esercizio, spiegare un passaggio, analizzare un disegno
4. Quando lo studente è pronto, indica che la fotocamera si aprirà

ESEMPI:
- "voglio fotografare un esercizio di matematica" → "Ottimo! Scatta la foto e ti aiuto a risolverlo passo per passo"
- "ho fatto un disegno tecnico" → "Perfetto! Fotografalo e lo analizziamo insieme per migliorarlo"

Se lo studente non ha specificato, chiedi: "Cosa vuoi fotografare? Come posso aiutarti?"`,

  homework: `
## MODALITÀ COMPITI

Questa modalità permette allo studente di caricare i compiti per ricevere aiuto.

Quando lo studente apre questa modalità:
1. Chiedi di quale materia sono i compiti e cosa deve fare
2. Spiega che può caricare foto o PDF dei compiti
3. Guida la conversazione per capire dove è bloccato o cosa non ha capito
4. Offri di aiutarlo passo per passo senza dare le risposte direttamente
5. Quando lo studente è pronto, indica che può caricare i compiti

ESEMPI:
- "ho problemi con le equazioni" → "Nessun problema! Carica i compiti e li risolviamo insieme, ti spiego ogni passaggio"
- "non capisco l'analisi logica" → "Tranquillo! Carica la frase e ti guido nell'analisi passo per passo"

IMPORTANTE: Il tuo ruolo è GUIDARE, non risolvere al posto dello studente. Fai domande, dai suggerimenti, verifica la comprensione.

Se lo studente non ha specificato, chiedi: "Di quale materia sono i compiti? Dove ti serve aiuto?"`,
};

/**
 * Build dynamic demo context based on maestro's teaching style
 * Includes CAPABILITY PALETTE so maestro knows what's technically possible
 * Note: Examples are in English but the Maestro will respond in user's language
 */
function getDemoContext(maestroId?: string): string {
  const maestro = maestroId ? getMaestroById(maestroId) : null;
  const teachingStyle = maestro?.teachingStyle || 'Interactive and engaging';
  const maestroName = maestro?.name || 'Maestro';
  
  return `
## INTERACTIVE DEMO MODE

You are ${maestroName}. Your style: "${teachingStyle}"

### 🎨 CAPABILITY PALETTE - What you can request:

**VISUAL ELEMENTS available:**
- Colored blocks/shapes (squares, circles, rectangles)
- Element grid (e.g., array for multiplication)
- Timeline (horizontal navigable line)
- Map/canvas (drawable area)
- Charts (bar, line, pie)
- Characters/icons (simple animated figures)
- Large animated text (numbers, words)
- Particles (decorative background)

**INTERACTIONS available:**
- Slider (user drags to change a value)
- Click on elements (select, activate, reveal)
- Drag & drop (drag objects)
- Hover (show info on mouse over)
- Numeric input (enter values)
- Buttons (execute action)
- Navigation (forward/back, zoom)

**ANIMATIONS available:**
- Elements appearing one by one
- Smooth movement (objects moving)
- Growth/shrink (scale)
- Rotation
- Pulsation (pulse)
- Gradual color change
- Particle/confetti explosion (celebration)
- State transitions

**FEEDBACK available:**
- Visual sound (flash, shake on correct/wrong)
- Animated counter (scrolling numbers)
- Progress bar
- Stars/points appearing
- Success message

### 🎯 HOW TO DESCRIBE YOUR DEMO:

1. **TITLE**: Catchy name
2. **CONCEPT**: What it teaches (e.g., "multiplication", "water cycle")
3. **VISUALIZATION**: Describe HOW you want it to look using palette elements
   - "I want a GRID of colored BLOCKS, 3 rows by 4 columns"
   - "I want a TIMELINE with 5 clickable POINTS"
   - "I want PARTICLES that move and group together"
4. **INTERACTION**: What the student can do using palette interactions
   - "The student uses a SLIDER to change the number of rows"
   - "The student CLICKS on blocks to color them"
   - "The student DRAGS characters onto the map"
5. **WOW FACTOR**: What makes it memorable
   - "When they find the answer, colored CONFETTI!"
   - "Numbers GROW with counter animation"

### 💡 EXAMPLES FOR YOUR STYLE (${maestroName}):

${getStyleExamples(maestroName)}

### ⚠️ IMPORTANT:
- Use terms from the PALETTE above so I understand what you want
- Be specific: "5 blocks in a row" is better than "some blocks"
- Indicate colors if important: "BLUE and RED blocks"
- Describe animation: "appear ONE BY ONE" vs "appear ALL TOGETHER"

If the student hasn't specified a topic, ask: "What would you like to explore together?"`;
}

/**
 * Get style-specific examples based on maestro
 */
function getStyleExamples(maestroName: string | undefined): string {
  switch (maestroName) {
    case 'Euclide':
      return `- "GRID of blocks forming a RECTANGLE. SLIDER for rows and columns. AREA appears as animated LARGE NUMBER. When values change, blocks APPEAR ONE BY ONE."
- "CIRCLE dividing into SLICES (fractions). CLICK on each slice to COLOR it. Number of colored slices / total appears above."`;
    
    case 'Feynman':
      return `- "Colored PARTICLES BOUNCING in a container. SLIDER for TEMPERATURE. Hotter = FASTER and more CHAOTIC movement. Colors change from BLUE (cold) to RED (hot)!"
- "BALLOONS that MULTIPLY! Click the button and each balloon DUPLICATES with an animated POP. Count the balloons = multiplication!"`;
    
    case 'Erodoto':
      return `- "Horizontal TIMELINE with 5 POINTS. HOVER on each point to see the event. CLICK to expand the full story. Animated CHARACTER walking along the timeline."
- "Ancient MAP with changing BORDERS. SLIDER for year (500 BC → 2000 AD). Territories gradually change COLOR. CLICK on a region for info."`;
    
    case 'Darwin':
      return `- "Tree of life that GROWS. Each BRANCH is a species. CLICK on a branch to see characteristics. Species APPEAR one after another following evolution."
- "Environment with CREATURES that change. SLIDER for time (millions of years). Creatures gradually TRANSFORM. The fittest GLOW."`;
    
    case 'Curie':
      return `- "ATOMS that VIBRATE. Some are STABLE (green), others RADIOACTIVE (glowing). CLICK on a radioactive atom to see animated DECAY. Geiger COUNTER making TIC-TIC."
- "MOLECULES that COMBINE. DRAG molecules together. If reaction works = light FLASH and visible ENERGY released!"`;
    
    case 'Leonardo':
      return `- "MACHINE with GEARS. CLICK to start it. Gears ROTATE connected. Change the SPEED of one and see effects on others."
- "DRAWING sheet with PERSPECTIVE. DRAG the vanishing point. Guide lines UPDATE. POSITION objects and see how sizes change."`;
    
    case 'Álex Pina':
      return `- "HEIST PLANNING BOARD with PHASES. CLICK on each phase for Spanish vocabulary. Characters from 'la banda' appear. WORDS appear dramatically one by one."
- "MUSIC VIDEO with LYRICS. Song plays with KARAOKE style Spanish text. CLICK on words to see meaning. PRONUNCIATION button for each line!"
- "ESCAPE ROOM style game. SOLVE Spanish puzzles to unlock doors. TIMER adds suspense. Victory = CONFETTI and '¡Bella ciao!'"`;
    
    case 'Shakespeare':
      return `- "STAGE with CHARACTERS. DRAG words to complete the dialogue. Characters SPEAK when complete. Star RATING for pronunciation."
- "Word TREE that grows. Each BRANCH is a phrasal verb. CLICK to see meaning and example. QUIZ to match meanings!"`;
    
    default:
      return `- "GRID of colored elements. SLIDER to change quantity. Elements APPEAR with animation. CLICK to interact."
- "Interactive DIAGRAM. HOVER for info. CLICK to expand. SMOOTH transitions between states."
- "Navigable TIMELINE. DRAG to scroll. Clickable POINTS with informative POPUPS."`;
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
            search: 'web_search',
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
