// ============================================================================
// TOOL STATE OPERATIONS
// Create, update, complete, fail, cancel tool states
// ============================================================================

import { logger } from '@/lib/logger';
import type { ToolType } from '../tool-events';
import type { ToolContent, ToolState } from './types';

// In-memory store for active tool states
// Key: toolId, Value: ToolState
export const activeTools = new Map<string, ToolState>();

// Session to tools mapping for quick lookup
export const sessionTools = new Map<string, Set<string>>();

// #90: Schedule automatic cleanup for terminal states to prevent memory leaks
// Default: cleanup after 5 minutes for terminal states
const TERMINAL_STATE_TTL_MS = 5 * 60 * 1000;

function scheduleToolCleanup(toolId: string, sessionId: string): void {
  setTimeout(() => {
    const state = activeTools.get(toolId);
    // Only delete if still in terminal state (might have been recreated)
    if (state && ['completed', 'error', 'cancelled'].includes(state.status)) {
      activeTools.delete(toolId);
      const sessionToolSet = sessionTools.get(sessionId);
      if (sessionToolSet) {
        sessionToolSet.delete(toolId);
        if (sessionToolSet.size === 0) {
          sessionTools.delete(sessionId);
        }
      }
      logger.debug('Tool state auto-cleaned', { toolId });
    }
  }, TERMINAL_STATE_TTL_MS);
}

/**
 * Initialize empty content structure based on tool type
 */
export function initializeContent(type: ToolType): Partial<ToolContent> {
  switch (type) {
    case 'mindmap':
      return { centralTopic: '', nodes: [] };
    case 'flashcard':
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
    if (!state.rawChunks) {
      state.rawChunks = [];
    }
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

  // #90: Schedule cleanup to prevent memory leak
  scheduleToolCleanup(toolId, state.sessionId);

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

  // #90: Schedule cleanup to prevent memory leak
  scheduleToolCleanup(toolId, state.sessionId);

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

  // #90: Schedule cleanup to prevent memory leak
  scheduleToolCleanup(toolId, state.sessionId);

  logger.info('Tool state cancelled', {
    toolId,
    type: state.type,
    progress: state.progress,
  });

  return state;
}
