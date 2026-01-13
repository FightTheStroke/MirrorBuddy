// ============================================================================
// TOOL CORE TYPES
// ============================================================================

/**
 * All supported tool types in MirrorBuddy
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
  | 'pdf'          // PDF caricato
  | 'homework'     // Compiti con metodo maieutico
  | 'study-kit'    // Bulk PDF processing with study materials
  | 'calculator';  // Calcolatrice scientifica con supporto dyscalculia

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

/**
 * Tool call tracking (for voice/chat sessions)
 * Different from OpenAI ToolCall (see lib/ai/providers.ts)
 */
export interface ToolCall {
  id: string;
  type: ToolType;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: ToolResult;
}

/**
 * Result of a tool call execution
 */
export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: unknown;
  renderComponent?: string; // Component name to render
}

/**
 * Lightweight tool call reference for database storage.
 * Avoids duplicating content (stored in Material table).
 * Use ToolCall for runtime state, ToolCallRef for persistence.
 */
export interface ToolCallRef {
  id: string;              // Same as Material.toolId
  type: ToolType;          // Tool type for routing
  name: string;            // Function name (e.g., 'create_mindmap')
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;          // Error message if status is 'error'
  materialId?: string;     // FK to Material (if saved)
}

/**
 * Convert full ToolCall to lightweight ToolCallRef for DB storage
 */
export function toToolCallRef(toolCall: ToolCall): ToolCallRef {
  return {
    id: toolCall.id,
    type: toolCall.type,
    name: toolCall.name,
    status: toolCall.status,
    error: toolCall.result?.error,
    materialId: toolCall.id, // toolId is used as materialId
  };
}

/**
 * Map OpenAI function names to tool types
 */
export function functionNameToToolType(functionName: string): ToolType {
  const map: Record<string, ToolType> = {
    'create_mindmap': 'mindmap',
    'create_quiz': 'quiz',
    'create_flashcards': 'flashcard',
    'create_demo': 'demo',
    'web_search': 'search',
    'create_summary': 'summary',
    'create_diagram': 'diagram',
    'create_timeline': 'timeline',
  };
  return map[functionName] || (functionName as ToolType);
}
