// ============================================================================
// TOOL TYPES - Unified across voice and chat
// Related: ADR 0009 - Tool Execution Architecture
// ============================================================================

/**
 * All supported tool types in ConvergioEdu
 */
export type ToolType =
  | 'mindmap'      // Mappa mentale interattiva (MarkMap)
  | 'quiz'         // Quiz con domande a risposta multipla
  | 'flashcard'    // Set di flashcard per ripasso (FSRS)
  | 'demo'         // Simulazione HTML/JS interattiva
  | 'search'       // Ricerca web/YouTube
  | 'diagram'      // Diagramma (Mermaid)
  | 'timeline'     // Linea temporale
  | 'summary'      // Riassunto strutturato
  | 'formula'      // Formula matematica (KaTeX)
  | 'chart'        // Grafico (Chart.js)
  | 'webcam'       // Foto da webcam
  | 'pdf';         // PDF caricato

/**
 * OpenAI function definitions for chat API
 * These are passed to the `tools` parameter in chat completions
 */
export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_mindmap',
      description: 'Crea una mappa mentale interattiva su un argomento. Usa questo strumento quando lo studente chiede di visualizzare concetti, creare schemi, o organizzare informazioni.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento principale della mappa mentale',
          },
          nodes: {
            type: 'array',
            description: 'Nodi della mappa mentale',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID univoco del nodo' },
                label: { type: 'string', description: 'Testo del nodo' },
                parentId: { type: 'string', description: 'ID del nodo padre (null per root)' },
              },
              required: ['id', 'label'],
            },
          },
        },
        required: ['topic', 'nodes'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_quiz',
      description: 'Crea un quiz interattivo con domande a risposta multipla. Usa questo strumento quando lo studente vuole testare la sua comprensione o ripassare.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento del quiz',
          },
          questions: {
            type: 'array',
            description: 'Domande del quiz',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: 'Testo della domanda' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Opzioni di risposta (4 opzioni)',
                },
                correctIndex: {
                  type: 'number',
                  description: 'Indice della risposta corretta (0-3)',
                },
                explanation: {
                  type: 'string',
                  description: 'Spiegazione della risposta corretta',
                },
              },
              required: ['question', 'options', 'correctIndex'],
            },
          },
        },
        required: ['topic', 'questions'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_demo',
      description: 'Crea una simulazione interattiva HTML/JS per visualizzare concetti scientifici o matematici. Usa per dimostrazioni visive come il sistema solare, moto dei proiettili, circuiti elettrici.',
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
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Cerca contenuti educativi su web o YouTube. Usa quando lo studente ha bisogno di risorse esterne, video tutorial, o approfondimenti.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query di ricerca',
          },
          type: {
            type: 'string',
            enum: ['web', 'youtube', 'all'],
            description: 'Tipo di ricerca: web, youtube, o entrambi',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_flashcards',
      description: 'Crea un set di flashcard per il ripasso con spaced repetition. Usa quando lo studente vuole memorizzare definizioni, formule, o concetti.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Argomento delle flashcard',
          },
          cards: {
            type: 'array',
            description: 'Le flashcard da creare',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string', description: 'Fronte della carta (domanda)' },
                back: { type: 'string', description: 'Retro della carta (risposta)' },
              },
              required: ['front', 'back'],
            },
          },
        },
        required: ['topic', 'cards'],
      },
    },
  },
] as const;

/**
 * Tool state for real-time UI updates
 */
export interface ToolState {
  id: string;
  type: ToolType;
  status: 'initializing' | 'building' | 'completed' | 'error';
  progress: number; // 0-1
  content: unknown;
  error?: string;
  createdAt: Date;
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  sessionId?: string;
  userId?: string;
  maestroId?: string;
  conversationId?: string;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  toolId: string;
  toolType: ToolType;
  data?: unknown;
  error?: string;
}

/**
 * Tool event types - matches tool-events.ts
 * Re-exported for convenience
 */
export type ToolEventType =
  | 'tool:created'      // New tool started
  | 'tool:update'       // Incremental update (content chunk)
  | 'tool:complete'     // Tool finished building
  | 'tool:error'        // Error during creation
  | 'tool:cancelled';   // User cancelled

// ============================================================================
// Mindmap specific types
// ============================================================================

export interface MindmapNode {
  id: string;
  label: string;
  parentId?: string | null;
}

export interface MindmapData {
  topic: string;
  nodes: MindmapNode[];
  markdown?: string;
}

// ============================================================================
// Quiz specific types
// ============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

// ============================================================================
// Demo specific types
// ============================================================================

export interface DemoData {
  title: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
}

// ============================================================================
// Search specific types
// ============================================================================

export interface SearchResult {
  type: 'web' | 'youtube';
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  duration?: string; // YouTube only
}

export interface SearchData {
  query: string;
  searchType: 'web' | 'youtube' | 'all';
  results: SearchResult[];
}

// ============================================================================
// Flashcard specific types
// ============================================================================

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface FlashcardData {
  topic: string;
  cards: FlashcardItem[];
}
