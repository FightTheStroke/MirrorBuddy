/**
 * Voice Tool Commands
 *
 * Defines tool schemas for Azure Realtime API and handles tool execution.
 * Bridges voice commands to the real-time tool-events/tool-state system.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import { logger } from '@/lib/logger';
import type { ToolType } from '@/lib/realtime/tool-events';
import type { Subject } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Voice tool definition for Azure Realtime API.
 */
export interface VoiceToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Voice tool call result.
 */
export interface VoiceToolCallResult {
  success: boolean;
  toolId?: string;
  toolType?: ToolType;
  error?: string;
  displayed?: boolean;
}

/**
 * Arguments for create_mindmap tool.
 */
export interface CreateMindmapArgs {
  title: string;
  topic: string;
  subject?: Subject;
  nodes?: Array<{
    id: string;
    label: string;
    parentId?: string;
  }>;
}

/**
 * Arguments for create_quiz tool.
 */
export interface CreateQuizArgs {
  title: string;
  subject: Subject;
  topic?: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questions?: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}

/**
 * Arguments for create_flashcards tool.
 */
export interface CreateFlashcardsArgs {
  name: string;
  subject: Subject;
  topic?: string;
  cardCount?: number;
  cards?: Array<{
    front: string;
    back: string;
    hint?: string;
  }>;
}

/**
 * Arguments for create_summary tool.
 */
export interface CreateSummaryArgs {
  title: string;
  subject?: Subject;
  topic: string;
  length?: 'short' | 'medium' | 'long';
}

/**
 * Arguments for create_diagram tool.
 */
export interface CreateDiagramArgs {
  title: string;
  type: 'flowchart' | 'sequence' | 'class' | 'er';
  topic: string;
  subject?: Subject;
}

/**
 * Arguments for create_timeline tool.
 */
export interface CreateTimelineArgs {
  title: string;
  subject?: Subject;
  period: string;
  events?: Array<{
    date: string;
    title: string;
    description: string;
  }>;
}

/**
 * Arguments for web_search tool.
 */
export interface WebSearchArgs {
  query: string;
}

/**
 * Arguments for capture_homework tool.
 */
export interface CaptureHomeworkArgs {
  purpose: string;
  instructions?: string;
}

/**
 * Union of all tool arguments.
 */
export type VoiceToolArgs =
  | { name: 'create_mindmap'; args: CreateMindmapArgs }
  | { name: 'create_quiz'; args: CreateQuizArgs }
  | { name: 'create_flashcards'; args: CreateFlashcardsArgs }
  | { name: 'create_summary'; args: CreateSummaryArgs }
  | { name: 'create_diagram'; args: CreateDiagramArgs }
  | { name: 'create_timeline'; args: CreateTimelineArgs }
  | { name: 'web_search'; args: WebSearchArgs }
  | { name: 'capture_homework'; args: CaptureHomeworkArgs };

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Voice tool definitions for Azure Realtime API.
 * These are registered with the session.update message.
 */
export const VOICE_TOOLS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'create_mindmap',
    description:
      'Crea una mappa mentale interattiva per visualizzare concetti. Usala quando lo studente chiede di organizzare un argomento, creare uno schema, o vuole vedere le connessioni tra concetti.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo della mappa mentale',
        },
        topic: {
          type: 'string',
          description: 'Argomento principale da mappare',
        },
        subject: {
          type: 'string',
          description: 'Materia (mathematics, physics, history, etc.)',
        },
        nodes: {
          type: 'array',
          description: 'Nodi della mappa (opzionale, possono essere generati)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              parentId: { type: 'string' },
            },
          },
        },
      },
      required: ['title', 'topic'],
    },
  },
  {
    type: 'function',
    name: 'create_quiz',
    description:
      'Crea un quiz interattivo per testare la comprensione. Usalo quando lo studente vuole verificare cosa ha imparato, fare pratica, o prepararsi per un test.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo del quiz',
        },
        subject: {
          type: 'string',
          description: 'Materia del quiz',
        },
        topic: {
          type: 'string',
          description: 'Argomento specifico',
        },
        questionCount: {
          type: 'number',
          description: 'Numero di domande (default: 5)',
        },
        difficulty: {
          type: 'string',
          enum: ['easy', 'medium', 'hard'],
          description: 'Difficoltà del quiz',
        },
        questions: {
          type: 'array',
          description: 'Domande (opzionale)',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correctIndex: { type: 'number' },
              explanation: { type: 'string' },
            },
          },
        },
      },
      required: ['title', 'subject'],
    },
  },
  {
    type: 'function',
    name: 'create_flashcards',
    description:
      'Crea flashcard per lo studio e la memorizzazione. Usalo quando lo studente vuole memorizzare termini, definizioni, formule, o date.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nome del mazzo di flashcard',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
        topic: {
          type: 'string',
          description: 'Argomento specifico',
        },
        cardCount: {
          type: 'number',
          description: 'Numero di flashcard (default: 10)',
        },
        cards: {
          type: 'array',
          description: 'Carte (opzionale)',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              hint: { type: 'string' },
            },
          },
        },
      },
      required: ['name', 'subject'],
    },
  },
  {
    type: 'function',
    name: 'create_summary',
    description:
      'Crea un riassunto strutturato di un argomento. Usalo quando lo studente vuole una sintesi, un ripasso, o deve prepararsi velocemente.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo del riassunto',
        },
        topic: {
          type: 'string',
          description: 'Argomento da riassumere',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
        length: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          description: 'Lunghezza del riassunto',
        },
      },
      required: ['title', 'topic'],
    },
  },
  {
    type: 'function',
    name: 'create_diagram',
    description:
      'Crea un diagramma (flowchart, sequence, class, ER). Usalo per processi, algoritmi, relazioni tra entità.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo del diagramma',
        },
        type: {
          type: 'string',
          enum: ['flowchart', 'sequence', 'class', 'er'],
          description: 'Tipo di diagramma',
        },
        topic: {
          type: 'string',
          description: 'Argomento/processo da diagrammare',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
      },
      required: ['title', 'type', 'topic'],
    },
  },
  {
    type: 'function',
    name: 'create_timeline',
    description:
      'Crea una linea del tempo per eventi storici o sequenze temporali.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo della timeline',
        },
        period: {
          type: 'string',
          description: 'Periodo storico o intervallo temporale',
        },
        subject: {
          type: 'string',
          description: 'Materia',
        },
        events: {
          type: 'array',
          description: 'Eventi (opzionale)',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
      required: ['title', 'period'],
    },
  },
  {
    type: 'function',
    name: 'web_search',
    description:
      'Cerca informazioni educative sul web. Usalo per trovare risorse aggiuntive, approfondimenti, o verificare informazioni.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query di ricerca',
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'capture_homework',
    description:
      'Richiedi allo studente di mostrare i compiti tramite webcam per aiutarlo.',
    parameters: {
      type: 'object',
      properties: {
        purpose: {
          type: 'string',
          description: 'Scopo della richiesta (es. "vedere l\'esercizio")',
        },
        instructions: {
          type: 'string',
          description: 'Istruzioni per lo studente (es. "inquadra bene il foglio")',
        },
      },
      required: ['purpose'],
    },
  },
];

// ============================================================================
// TOOL NAME TO TYPE MAPPING
// ============================================================================

/**
 * Maps voice tool names to ToolType.
 */
export function getToolTypeFromName(name: string): ToolType | null {
  switch (name) {
    case 'create_mindmap':
      return 'mindmap';
    case 'create_quiz':
      return 'quiz';
    case 'create_flashcards':
      return 'flashcards';
    case 'create_summary':
      return 'summary';
    case 'create_diagram':
      return 'diagram';
    case 'create_timeline':
      return 'timeline';
    default:
      return null;
  }
}

/**
 * Check if a tool name is a tool creation command.
 */
export function isToolCreationCommand(name: string): boolean {
  return getToolTypeFromName(name) !== null;
}

// ============================================================================
// TOOL EXECUTION API
// ============================================================================

/**
 * Execute a voice tool command via the API.
 * This triggers the server-side tool creation and SSE broadcast.
 */
export async function executeVoiceTool(
  sessionId: string,
  maestroId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<VoiceToolCallResult> {
  const toolType = getToolTypeFromName(toolName);

  // Non-tool commands (web_search, capture_homework) are handled differently
  if (!toolType) {
    return { success: true, displayed: false };
  }

  try {
    // Call the API to create the tool and broadcast events
    const response = await fetch('/api/tools/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        maestroId,
        toolType,
        title: args.title || args.name || 'Untitled',
        subject: args.subject,
        content: args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to create tool' };
    }

    const result = await response.json();
    return {
      success: true,
      toolId: result.toolId,
      toolType,
      displayed: true,
    };
  } catch (error) {
    logger.error('[VoiceToolCommands] Failed to execute tool', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a tool ID for a voice command.
 */
export function generateToolId(): string {
  return `voice-tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// TOOL INSTRUCTION PROMPTS
// ============================================================================

/**
 * Additional instructions for the AI about when to use tools.
 * Injected into the voice session instructions.
 */
export const TOOL_USAGE_INSTRUCTIONS = `
## STRUMENTI DISPONIBILI

Hai accesso a strumenti per creare materiali didattici. USA questi strumenti quando appropriato:

### Quando usare create_mindmap:
- Lo studente dice "fammi una mappa", "crea uno schema", "organizza questo argomento"
- Vuole vedere le connessioni tra concetti
- Chiede di visualizzare un argomento

### Quando usare create_quiz:
- Lo studente dice "interrogami", "fammi delle domande", "voglio fare un test"
- Vuole verificare cosa ha capito
- Si sta preparando per una verifica

### Quando usare create_flashcards:
- Lo studente dice "fammi delle flashcard", "devo memorizzare"
- Vuole imparare vocaboli, date, formule, definizioni
- Chiede aiuto per memorizzare

### Quando usare create_summary:
- Lo studente dice "riassumimi", "fai una sintesi"
- Ha bisogno di un ripasso veloce
- Vuole i punti chiave di un argomento

### Quando usare create_diagram:
- Lo studente chiede un flowchart, un diagramma di flusso
- Vuole visualizzare un processo o algoritmo
- Ha bisogno di vedere relazioni (ER diagram)

### Quando usare create_timeline:
- Lo studente studia storia e chiede una linea del tempo
- Vuole ordinare eventi cronologicamente
- Ha bisogno di visualizzare sequenze storiche

### Quando usare capture_homework:
- Lo studente ha un esercizio scritto e ha bisogno di aiuto
- Dice "ti faccio vedere", "guarda questo problema"
- Ha difficoltà con un compito specifico

NOTA: Quando crei uno strumento, ANNUNCIALO prima vocalmente (es. "Ti preparo un quiz su questo argomento...") e poi invoca la funzione.
`;
