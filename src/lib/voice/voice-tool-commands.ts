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
 * Arguments for create_demo tool.
 */
export interface CreateDemoArgs {
  title: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
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

// ============================================================================
// MINDMAP MODIFICATION COMMAND TYPES (Phase 7: Voice Commands)
// ============================================================================

/** Arguments for mindmap_add_node tool. */
export interface MindmapAddNodeArgs {
  concept: string;
  parentNode?: string;
}

/** Arguments for mindmap_connect_nodes tool. */
export interface MindmapConnectNodesArgs {
  nodeA: string;
  nodeB: string;
}

/** Arguments for mindmap_expand_node tool. */
export interface MindmapExpandNodeArgs {
  node: string;
  suggestions?: string[];
}

/** Arguments for mindmap_delete_node tool. */
export interface MindmapDeleteNodeArgs {
  node: string;
}

/** Arguments for mindmap_focus_node tool. */
export interface MindmapFocusNodeArgs {
  node: string;
}

/** Arguments for mindmap_set_color tool. */
export interface MindmapSetColorArgs {
  node: string;
  color: string;
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
  | { name: 'create_demo'; args: CreateDemoArgs }
  | { name: 'web_search'; args: WebSearchArgs }
  | { name: 'capture_homework'; args: CaptureHomeworkArgs }
  // Mindmap modification commands
  | { name: 'mindmap_add_node'; args: MindmapAddNodeArgs }
  | { name: 'mindmap_connect_nodes'; args: MindmapConnectNodesArgs }
  | { name: 'mindmap_expand_node'; args: MindmapExpandNodeArgs }
  | { name: 'mindmap_delete_node'; args: MindmapDeleteNodeArgs }
  | { name: 'mindmap_focus_node'; args: MindmapFocusNodeArgs }
  | { name: 'mindmap_set_color'; args: MindmapSetColorArgs };

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
    name: 'create_demo',
    description:
      'Crea una simulazione interattiva HTML/JS per visualizzare concetti. Usalo per dimostrazioni visive come il sistema solare, moto dei proiettili, circuiti elettrici, animazioni matematiche.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titolo della simulazione',
        },
        description: {
          type: 'string',
          description: 'Breve descrizione di cosa mostra la demo',
        },
        html: {
          type: 'string',
          description: 'Codice HTML per la struttura',
        },
        css: {
          type: 'string',
          description: 'Codice CSS per lo stile (opzionale)',
        },
        js: {
          type: 'string',
          description: 'Codice JavaScript per l\'interattività (opzionale)',
        },
      },
      required: ['title', 'html'],
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
  // ============================================================================
  // MINDMAP MODIFICATION COMMANDS (Phase 7: Voice Commands)
  // ============================================================================
  {
    type: 'function',
    name: 'mindmap_add_node',
    description:
      'Aggiungi un nodo alla mappa mentale corrente. Usalo quando lo studente dice "aggiungi", "metti", "inserisci" un concetto.',
    parameters: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'Il concetto o testo da aggiungere come nuovo nodo',
        },
        parentNode: {
          type: 'string',
          description: 'Il nodo padre a cui collegare (opzionale, usa il nodo selezionato o centrale)',
        },
      },
      required: ['concept'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_connect_nodes',
    description:
      'Collega due nodi della mappa. Usalo quando lo studente dice "collega X con Y", "unisci", "fai un collegamento".',
    parameters: {
      type: 'object',
      properties: {
        nodeA: {
          type: 'string',
          description: 'Primo nodo da collegare',
        },
        nodeB: {
          type: 'string',
          description: 'Secondo nodo da collegare',
        },
      },
      required: ['nodeA', 'nodeB'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_expand_node',
    description:
      'Espandi un nodo con sotto-nodi. Usalo quando lo studente dice "espandi", "aggiungi dettagli", "approfondisci" un nodo.',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo da espandere',
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggerimenti per i sotto-nodi (opzionale, il Maestro può proporre)',
        },
      },
      required: ['node'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_delete_node',
    description:
      'Elimina un nodo dalla mappa. Usalo quando lo studente dice "cancella", "rimuovi", "togli" un nodo.',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo da eliminare',
        },
      },
      required: ['node'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_focus_node',
    description:
      'Centra la vista su un nodo specifico. Usalo quando lo studente dice "vai a", "mostrami", "zoom su" un nodo.',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo su cui fare focus',
        },
      },
      required: ['node'],
    },
  },
  {
    type: 'function',
    name: 'mindmap_set_color',
    description:
      'Cambia il colore di un nodo. Usalo quando lo studente dice "colora", "cambia colore", "fai rosso/blu/verde".',
    parameters: {
      type: 'object',
      properties: {
        node: {
          type: 'string',
          description: 'Il nodo da colorare',
        },
        color: {
          type: 'string',
          description: 'Il colore (rosso, blu, verde, giallo, arancione, viola, rosa)',
        },
      },
      required: ['node', 'color'],
    },
  },
];

// ============================================================================
// MINDMAP MODIFICATION COMMAND HELPERS
// ============================================================================

/**
 * List of mindmap modification command names.
 */
const MINDMAP_MODIFICATION_COMMANDS = [
  'mindmap_add_node',
  'mindmap_connect_nodes',
  'mindmap_expand_node',
  'mindmap_delete_node',
  'mindmap_focus_node',
  'mindmap_set_color',
] as const;

/**
 * Check if a tool name is a mindmap modification command.
 */
export function isMindmapModificationCommand(name: string): boolean {
  return MINDMAP_MODIFICATION_COMMANDS.includes(name as typeof MINDMAP_MODIFICATION_COMMANDS[number]);
}

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
    case 'create_demo':
      return 'demo';
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
  // Check for mindmap modification commands first
  if (isMindmapModificationCommand(toolName)) {
    return executeMindmapModification(sessionId, toolName, args);
  }

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
 * Execute a mindmap modification command via SSE broadcast.
 * These commands modify an existing mindmap in real-time.
 */
export async function executeMindmapModification(
  sessionId: string,
  commandName: string,
  args: Record<string, unknown>
): Promise<VoiceToolCallResult> {
  try {
    // Send modification event to SSE endpoint
    const response = await fetch('/api/tools/stream/modify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        command: commandName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to modify mindmap',
      };
    }

    logger.info('[VoiceToolCommands] Mindmap modification sent', { commandName, args });
    return {
      success: true,
      toolType: 'mindmap',
      displayed: true,
    };
  } catch (error) {
    logger.error('[VoiceToolCommands] Failed to modify mindmap', { error });
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

## COMANDI VOCALI PER MODIFICARE MAPPE MENTALI

Quando c'è una mappa mentale attiva, lo studente può modificarla vocalmente:

### mindmap_add_node
- "Aggiungi [concetto]" - aggiunge un nuovo nodo
- "Metti anche [concetto]" - aggiunge un nodo collegato
- "Inserisci [concetto] sotto [nodo]" - aggiunge figlio specifico

### mindmap_connect_nodes
- "Collega [A] con [B]" - crea connessione tra due nodi
- "Unisci [A] e [B]" - collega i nodi

### mindmap_expand_node
- "Espandi [nodo]" - genera sotto-nodi automaticamente
- "Approfondisci [nodo]" - aggiunge dettagli

### mindmap_delete_node
- "Cancella [nodo]" - rimuove il nodo
- "Togli [nodo]" - elimina dalla mappa

### mindmap_focus_node
- "Vai a [nodo]" - centra la vista su quel nodo
- "Mostrami [nodo]" - zoom su nodo specifico

### mindmap_set_color
- "Colora [nodo] di rosso/blu/verde" - cambia colore
- "Fai [nodo] giallo" - imposta colore

NOTA: Quando crei uno strumento, ANNUNCIALO prima vocalmente (es. "Ti preparo un quiz su questo argomento...") e poi invoca la funzione.
`;
