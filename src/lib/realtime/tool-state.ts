// ============================================================================
// REAL-TIME TOOL STATE MANAGEMENT
// Tracks the state of tools being built by Maestri in real-time
// Supports resumable tool creation and state persistence
// ============================================================================

import { logger } from '@/lib/logger';
import type { ToolType } from './tool-events';

// Tool creation status
export type ToolStatus =
  | 'initializing'   // Tool just started
  | 'building'       // Actively being built
  | 'paused'         // Temporarily paused
  | 'completed'      // Successfully finished
  | 'error'          // Failed with error
  | 'cancelled';     // User cancelled

// Base content types for different tools
export interface MindmapContent {
  centralTopic: string;
  nodes: Array<{
    id: string;
    label: string;
    parentId: string | null;
    color?: string;
  }>;
}

export interface FlashcardContent {
  cards: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
  }>;
}

export interface QuizContent {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
}

export interface SummaryContent {
  sections: Array<{
    id: string;
    heading: string;
    content: string;
  }>;
}

export interface TimelineContent {
  events: Array<{
    id: string;
    date: string;
    title: string;
    description: string;
  }>;
}

export interface DiagramContent {
  type: 'flowchart' | 'sequence' | 'class' | 'er';
  mermaidCode: string;
}

// Union type for all tool content
export type ToolContent =
  | MindmapContent
  | FlashcardContent
  | QuizContent
  | SummaryContent
  | TimelineContent
  | DiagramContent;

// Tool state structure
export interface ToolState {
  id: string;
  type: ToolType;
  status: ToolStatus;
  sessionId: string;
  maestroId: string;

  // Metadata
  title: string;
  subject?: string;
  createdAt: number;
  updatedAt: number;

  // Progress tracking
  progress: number; // 0-100
  chunksReceived: number;

  // Content (incrementally built)
  content: Partial<ToolContent>;

  // Raw chunks for replay/debugging
  rawChunks: string[];

  // Error info if failed
  errorMessage?: string;
}

// In-memory store for active tool states
// Key: toolId, Value: ToolState
const activeTools = new Map<string, ToolState>();

// Session to tools mapping for quick lookup
const sessionTools = new Map<string, Set<string>>();

/**
 * Create a new tool state
 */
export function createToolState(params: {
  id: string;
  type: ToolType;
  sessionId: string;
  maestroId: string;
  title: string;
  subject?: string;
}): ToolState {
  const now = Date.now();

  const state: ToolState = {
    id: params.id,
    type: params.type,
    status: 'initializing',
    sessionId: params.sessionId,
    maestroId: params.maestroId,
    title: params.title,
    subject: params.subject,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    chunksReceived: 0,
    content: initializeContent(params.type),
    rawChunks: [],
  };

  // Store in maps
  activeTools.set(params.id, state);

  if (!sessionTools.has(params.sessionId)) {
    sessionTools.set(params.sessionId, new Set());
  }
  sessionTools.get(params.sessionId)!.add(params.id);

  logger.info('Tool state created', {
    toolId: params.id,
    type: params.type,
    sessionId: params.sessionId,
    maestroId: params.maestroId,
  });

  return state;
}

/**
 * Initialize empty content structure based on tool type
 */
function initializeContent(type: ToolType): Partial<ToolContent> {
  switch (type) {
    case 'mindmap':
      return { centralTopic: '', nodes: [] };
    case 'flashcards':
      return { cards: [] };
    case 'quiz':
      return { questions: [] };
    case 'summary':
      return { sections: [] };
    case 'timeline':
      return { events: [] };
    case 'diagram':
      return { type: 'flowchart', mermaidCode: '' };
    default:
      return {};
  }
}

/**
 * Update tool state with new chunk
 */
export function updateToolState(
  toolId: string,
  update: {
    chunk?: string;
    progress?: number;
    content?: Partial<ToolContent>;
  }
): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for update', { toolId });
    return null;
  }

  // Update status if was initializing
  if (state.status === 'initializing') {
    state.status = 'building';
  }

  // Apply updates
  state.updatedAt = Date.now();

  if (update.chunk) {
    state.rawChunks.push(update.chunk);
    state.chunksReceived++;
  }

  if (update.progress !== undefined) {
    state.progress = Math.min(100, Math.max(0, update.progress));
  }

  if (update.content) {
    state.content = { ...state.content, ...update.content };
  }

  activeTools.set(toolId, state);

  logger.debug('Tool state updated', {
    toolId,
    progress: state.progress,
    chunksReceived: state.chunksReceived,
  });

  return state;
}

/**
 * Mark tool as completed
 */
export function completeToolState(
  toolId: string,
  finalContent?: ToolContent
): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for completion', { toolId });
    return null;
  }

  state.status = 'completed';
  state.progress = 100;
  state.updatedAt = Date.now();

  if (finalContent) {
    state.content = finalContent;
  }

  activeTools.set(toolId, state);

  logger.info('Tool state completed', {
    toolId,
    type: state.type,
    chunksReceived: state.chunksReceived,
    duration: state.updatedAt - state.createdAt,
  });

  return state;
}

/**
 * Mark tool as failed
 */
export function failToolState(
  toolId: string,
  errorMessage: string
): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for failure', { toolId });
    return null;
  }

  state.status = 'error';
  state.errorMessage = errorMessage;
  state.updatedAt = Date.now();

  activeTools.set(toolId, state);

  logger.error('Tool state failed', {
    toolId,
    type: state.type,
    error: errorMessage,
  });

  return state;
}

/**
 * Cancel tool creation
 */
export function cancelToolState(toolId: string): ToolState | null {
  const state = activeTools.get(toolId);
  if (!state) {
    logger.warn('Tool state not found for cancellation', { toolId });
    return null;
  }

  state.status = 'cancelled';
  state.updatedAt = Date.now();

  activeTools.set(toolId, state);

  logger.info('Tool state cancelled', {
    toolId,
    type: state.type,
    progress: state.progress,
  });

  return state;
}

/**
 * Get tool state by ID
 */
export function getToolState(toolId: string): ToolState | null {
  return activeTools.get(toolId) || null;
}

/**
 * Get all tools for a session
 */
export function getSessionToolStates(sessionId: string): ToolState[] {
  const toolIds = sessionTools.get(sessionId);
  if (!toolIds) return [];

  const states: ToolState[] = [];
  toolIds.forEach((id) => {
    const state = activeTools.get(id);
    if (state) states.push(state);
  });

  return states;
}

/**
 * Get active (in-progress) tools for a session
 */
export function getActiveToolStates(sessionId: string): ToolState[] {
  return getSessionToolStates(sessionId).filter(
    (s) => s.status === 'initializing' || s.status === 'building'
  );
}

/**
 * Clean up old completed/failed tools (call periodically)
 * Keeps tools for maxAge milliseconds after completion
 */
export function cleanupOldTools(maxAge: number = 3600000): number {
  const now = Date.now();
  let cleanedCount = 0;

  activeTools.forEach((state, toolId) => {
    // Only clean up terminal states
    if (
      ['completed', 'error', 'cancelled'].includes(state.status) &&
      now - state.updatedAt > maxAge
    ) {
      activeTools.delete(toolId);

      const sessionToolSet = sessionTools.get(state.sessionId);
      if (sessionToolSet) {
        sessionToolSet.delete(toolId);
        if (sessionToolSet.size === 0) {
          sessionTools.delete(state.sessionId);
        }
      }

      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.info('Cleaned up old tool states', { cleanedCount });
  }

  return cleanedCount;
}

/**
 * Get stats for monitoring
 */
export function getToolStateStats(): {
  totalTools: number;
  byStatus: Record<ToolStatus, number>;
  byType: Record<ToolType, number>;
  activeSessions: number;
} {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};

  activeTools.forEach((state) => {
    byStatus[state.status] = (byStatus[state.status] || 0) + 1;
    byType[state.type] = (byType[state.type] || 0) + 1;
  });

  return {
    totalTools: activeTools.size,
    byStatus: byStatus as Record<ToolStatus, number>,
    byType: byType as Record<ToolType, number>,
    activeSessions: sessionTools.size,
  };
}
