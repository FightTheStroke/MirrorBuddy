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
  | 'study-kit';   // Bulk PDF processing with study materials

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
